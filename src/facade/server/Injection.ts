import { isObject } from 'lodash-es'
import { callWithContext } from './Context'
import { signal } from './Signals'
import { getProperties } from './ComponentGraph'

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
        throw new Error(`Injectable ${name} not found`)
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
                            injectable?.declaration.name, injectable?.declaration, injectable.instance
                        )
                        return
                    }

                    if (oldProperty.__type === 'inject') {
                        const injectable = INJECTABLES.get(oldProperty.value)!
                        injectable.instance[key] = callWithContext(
                            () => inject(injectable.declaration),
                            injectable?.declaration.name, injectable?.declaration, injectable.instance
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
            properties: value.instance ? getProperties(value.instance).properties : value.properties
        }
    })

    return jsonable
}

export function inject<T>(serviceIdentifier: any): (() => T) {
    const ref: any = {
        __type: 'inject',
        _name: serviceIdentifier.name,
        _class: serviceIdentifier,
        _instance: null
    }

    if (!INJECTABLES.has(serviceIdentifier.name)) {
        INJECTABLES.set(ref._name, { declaration: ref._class, instance: null, properties: null })
    }

    function injectCallback() {
        return ref._instance ??= rebuildInjectables(ref._name)
    }

    injectCallback.prototype.toJSON = function() {
        return { __type: ref.__type, value: ref._name }
    }

    return injectCallback
}
