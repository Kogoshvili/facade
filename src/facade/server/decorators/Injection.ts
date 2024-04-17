import { makeComponentInstance } from '../ComponentManager'
import { IComponentNode } from '../Interfaces'

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
        INJECTABLES.set(target.name, { declaration: target, instance: null })
    }
}

export type iInject<T> = {
    _read: boolean,
    _write: boolean,
    _injectable: boolean,
    _name: string,
    _class: any,
    _mocked: boolean,
    _instance: T,
} & T

export function Inject<T>(
    serviceIdentifier: any,
    { read = true, write = true }: { read?: boolean, write?: boolean } = {}
): T {
    const mock: iInject<any> = {
        _read: read,
        _write: write,
        _injectable: true,
        _name: serviceIdentifier.name,
        _class: serviceIdentifier,
        _mocked: true,
        _instance: {}
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

                if (!injectable.instance) {
                    injectable.instance = new injectable.declaration()
                }

                target._instance = injectable.instance

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

            return Reflect.get(target._instance, prop, receiver)
        }
    })
}