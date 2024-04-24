const INJECTABLES = new Map<string, { declaration: any, instance: any }>()

export let currentInjectable: any | null = null

export function getInjectable(name: string) {
    return INJECTABLES.get(name)
}

export function clearInjectables() {
    INJECTABLES.forEach((value) => value.instance = null)
}

export function Injectable(): ClassDecorator {
    return (target: any) => {
        target.prototype._injectable = true
        target.prototype._name = target.name
        target.prototype._dependants = new Set()
        INJECTABLES.set(target.name, { declaration: target, instance: null })
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
        if (!ref._instance) {
            const injectable = INJECTABLES.get(ref._name)

            if (injectable === undefined) {
                throw new Error(`No provider for type: ${ref._name}`)
            }

            if (!injectable.instance) {
                currentInjectable = ref._class
                injectable.instance = new injectable.declaration()
                currentInjectable = null
            }

            ref._instance = injectable.instance
        }

        return ref._instance
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
