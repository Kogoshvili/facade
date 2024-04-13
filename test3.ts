const INJECTABLES = new Map()

const Injectable = (): ClassDecorator => {
    return (target: any) => {
        INJECTABLES.set(target.name, new target())
    }
}

const Inject = (serviceIdentifier: any): ParameterDecorator => {
    return (target: any, propertyKey, parameterIndex) => {
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

@Injectable()
class Service {
    name: string

    constructor() {
        this.name = 'Service'
    }
}

// @Component()
class Component {
    name: string
    @Inject(Service) service: Service

    constructor() {}

    init() {
        this.name = this.service.name
    }
}

const dependencies = Component.prototype._dependencies
const component = new Component()

dependencies.forEach(({ property, className }: any) => {
    console.log(property, className)
    component[property] = INJECTABLES.get(className)
})

component.init()

console.log(component.name)
