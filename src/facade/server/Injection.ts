import { makeComponentInstance } from "./ComponentManager"
import { IComponentNode } from "./Interfaces"

const INJECTABLES = new Map<string, { declaration: any, instance: any }>()

export function clearInjectables() {
    INJECTABLES.forEach((value) => value.instance = null)
}

export function Injectable(): ClassDecorator {
    return (target: any) => {
        target.prototype._injectable = true
        target.prototype._name = target.name
        target.prototype._mocked = false
        target.prototype._subscribers = {}
        INJECTABLES.set(target.name, { declaration: target, instance: new target() })
    }
}

export interface IInject<T = any> {
    _read: boolean,
    _write: boolean,
    _injectable: boolean,
    _name: string,
    _class: any,
    _mocked: boolean,
    instance: any,
    [key: string]: any
}

export function Inject<T>(
    serviceIdentifier: any,
    { read = true, write = true }: { read?: boolean, write?: boolean } = {}
): IInject<T> {
    const injectable = INJECTABLES.get(serviceIdentifier.name)

    if (!injectable) {
        INJECTABLES.set(serviceIdentifier.name, { declaration: serviceIdentifier, instance: new serviceIdentifier() })
    } else if (!injectable?.instance) {
        injectable.instance = new serviceIdentifier()
    }

    const mock = {
        _read: read,
        _write: write,
        _injectable: true,
        _name: serviceIdentifier.name,
        _class: serviceIdentifier,
        _mocked: true,
        instance: INJECTABLES.get(serviceIdentifier.name)?.instance
    }


    return mock

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
                target.instance = injectable.instance ?? new injectable.declaration()

                const componentNodes: IComponentNode[][] = []

                Object.keys(serviceIdentifier.prototype._subscribers).forEach(s => {
                    const isListener = serviceIdentifier.prototype._subscribers[s].read
                    if (isListener) {
                        componentNodes.push(makeComponentInstance(s))
                    }
                })

                componentNodes.forEach(nodes => {
                    nodes.forEach(n => n.instance?.init?.())
                })
            }

            return Reflect.get(target.instance, prop, receiver)
        }
    })
}
