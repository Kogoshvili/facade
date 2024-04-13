import { nanoid } from 'nanoid'
import { InjectDependencies } from './Injection'

function build(
    component: any,
    metaProps: any = {},
    props: Record<string, any> = {},
    overwrites: Record<string, any> = {}
): any {
    const instance = new component(props)

    InjectDependencies(instance, component)

    setMetadata(instance, {
        ...metaProps,
        _name: component.name
    })

    overwriteProps(instance, overwrites)

    instance.init?.()

    const proxyfied = new Proxy(instance, {
        set(target, property, value, receiver) {
            const result = Reflect.set(target, property, value, receiver)
            // console.log(`Property ${property.toString()} changed to ${value}`)
            return result
        }
    })

    return proxyfied
}

function setMetadata(target: any, props: any = {}) {
    target._parent = props._parent ?? {}
    target._id = props._id ?? nanoid(10)
    target._name = props._name ?? null
    target._key = props._key ?? null
}

export function overwriteProps(target: any, props: Record<string, any> = {}) {
    const compProperties = Object.getOwnPropertyNames(target)
    for (const property of compProperties) {
        if (props?.[property]) {
            target[property] = props[property]
        }
    }
}

export default build
