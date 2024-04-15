const INJECTABLES = new Map<string, { declaration: any, instance: any }>()

export function clearInjectables() {
    INJECTABLES.forEach((value) => value.instance = null)
}

export function Injectable(): ClassDecorator {
    return (target: any) => {
        target.prototype._injectable = true
        target.prototype._name = target.name
        target.prototype._mocked = false
        INJECTABLES.set(target.name, { declaration: target, instance: new target() })
    }
}

export function Inject<T>(serviceIdentifier: any): T {
    const mock = {
        _injectable: true,
        _name: serviceIdentifier.name,
        _mocked: true,
        instance: {}
    }

    return new Proxy(mock, {
        get: (target: any, prop: any, receiver: any) => {
            const p = prop.toString()
            if (p.startsWith('_') || p === 'toString' || p === 'toJSON') {
                return Reflect.get(target, prop, receiver)
            }

            if (target._mocked) {
                const injectable = INJECTABLES.get(target._name)

                if (injectable === undefined) {
                    throw new Error(`No provider for type: ${target._name}`)
                }

                target._mocked = false
                target.instance = new injectable.declaration()
            }

            return Reflect.get(target.instance, prop, receiver)
        }
    })
}
