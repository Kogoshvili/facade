import { isObject } from "lodash"
import { callWithContext } from "./Context"
import { signal } from "./Signals"

const INJECTABLES = new Map<string, { declaration: any, instance: any, properties: any }>()

export function getInjectable(name: string) {
    return INJECTABLES.get(name)
}

export function clearInjectables() {
    INJECTABLES.forEach((value) => {
        value.instance = null
        value.properties = null
    })
}

export function parseInjectables(json: string) {
    const oldMap = JSON.parse(json)
    INJECTABLES.forEach((value, key) => {
        value.properties = oldMap[key].properties
    })
}

export function rebuildInjectables(name: string) {
    const injectable = INJECTABLES.get(name)

    if (injectable === undefined) {
        throw new Error(`No provider for type: ${name}`)
    }

    if (!injectable.instance) {
        injectable.instance = callWithContext(
            () => new injectable.declaration(),
            injectable?.declaration.name, injectable?.declaration
        )

        if (injectable.properties) {
            Object.keys(injectable.properties).forEach((key) => {
                const oldProperty = injectable.properties[key]

                if (isObject(oldProperty)) {
                    if (oldProperty.__type === 'signal') {
                        injectable.instance[key] = callWithContext(
                            () => signal(oldProperty.value),
                            injectable?.declaration.name, injectable?.declaration
                        )
                        return
                    }

                    if (oldProperty.__type === 'inject') {
                        const injectable = INJECTABLES.get(oldProperty.value)!
                        injectable.instance[key] = callWithContext(
                            () => Inject(injectable.declaration),
                            injectable?.declaration.name, injectable?.declaration
                        )
                        return
                    }
                }

                injectable.instance[key] = injectable.properties[key]
            })
        }
    }


    return injectable.instance
}

export function getJSONableInjectables() {
    const jsonable: any = {};

    INJECTABLES.forEach((value, key) => {
        jsonable[key] = {
            properties: {...value.instance}
        }
    })

    return jsonable
}

export function Injectable(): ClassDecorator {
    return (target: any) => {
        target.prototype._injectable = true
        target.prototype._name = target.name
        target.prototype._dependants = new Set()
        INJECTABLES.set(target.name, { declaration: target, instance: null, properties: null })
    }
}

export function Inject<T>(serviceIdentifier: any): (() => T) {
    const ref: any = {
        _injectable: true,
        _name: serviceIdentifier.name,
        _class: serviceIdentifier,
        _instance: null
    }

    function callback() {
        const result = ref._instance ??= rebuildInjectables(ref._name)
        return result
    }

    callback.prototype.toJSON = function() {
        return { __type: 'inject', value: ref._name }
    }

    return new Proxy(callback, {
        get: (target: any, p: string | symbol, _receiver: any): any => {
            if (target.prototype[p]) return target.prototype[p]
            return (ref as any)[p]
        },
    })
}
