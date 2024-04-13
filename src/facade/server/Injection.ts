const INJECTABLES = new Map()

function Injectable(): ClassDecorator {
    return (target: any) => {
        if (INJECTABLES.has(target.name)) {
            throw new Error(`Duplicate provider: ${target.name}`)
        }

        target.prototype._injectable = true
        INJECTABLES.set(target.name, new target())
    }
}

function Inject(serviceIdentifier: any): ParameterDecorator {
    return (target: any, propertyKey) => {
        if (!INJECTABLES.has(serviceIdentifier.name)) {
            throw new Error(`No provider for type: ${serviceIdentifier.name}`)
        }

        target._dependencies = target._dependencies || []
        target._dependencies.push({
            property: propertyKey,
            className: serviceIdentifier.name
        })
    }
}

function InjectDependencies(instance: any, component: any) {
    const dependencies = component.prototype._dependencies || []

    dependencies.forEach(({ property, className }: any) => {
        instance[property] = INJECTABLES.get(className)
    })
}

export { Injectable, Inject, InjectDependencies }
