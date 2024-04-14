const INJECTABLES = new Map<string, { declaration: any, instance: any }>()

export function clearInjectables() {
    INJECTABLES.forEach((value) => {
        value.instance = null
    })
}

export function Injectable(): ClassDecorator {
    return (target: any) => {
        target.prototype._injectable = true
        target.prototype._name = target.name
        target.prototype._mocked = false
        INJECTABLES.set(target.name, { declaration: target, instance: new target() })
    }
}

export function Inject(serviceIdentifier: any): ParameterDecorator {
    return (target: any, propertyKey) => {
        target._dependencies = target._dependencies || []
        target._dependencies.push({
            property: propertyKey,
            className: serviceIdentifier.name
        })
    }
}

export function InjectDependencies(instance: any, component: any) {
    const dependencies = component.prototype._dependencies || []

    dependencies.forEach(({ property, className }: any) => {
        const injectable = INJECTABLES.get(className)

        if (!injectable) {
            throw new Error(`No provider for type: ${className}`)
        }

        instance[property] = {
            _injectable: true,
            _name: className,
            _mocked: true
        }

        instance[property] = new Proxy(instance[property], {
            get: proxyGet
        })
    })
}

// const subscribers: string[] = []

function proxyGet(target: any, prop: any, receiver: any) {
    if (prop.toString().startsWith('_') || prop.toString() === 'toString') {
        return Reflect.get(target, prop, receiver)
    }

    if (target._mocked) {
        const injectable = INJECTABLES.get(target._name)

        if (injectable === undefined) {
            throw new Error(`No provider for type: ${target._name}`)
        }

        target = injectable.instance ?? new injectable.declaration()
    }

    // Object.getOwnPropertyNames(target).forEach((property) => {
    //     target[property] = new Proxy(target[property], {
    //         get: (target: any, prop: any, receiver: any) => {
    //             if (prop.toString() === 'subscribe') {
    //                 console.log('subscribed', target, prop, receiver)
    //                 subscribers.push(receiver._name)
    //             }

    //             return Reflect.get(target, prop, receiver)
    //         }
    //     })
    // })

    return Reflect.get(target, prop, receiver)
}
