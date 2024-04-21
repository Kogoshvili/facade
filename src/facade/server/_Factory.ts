import { IComponent } from './Interfaces'

async function build(
    component: any,
    metaProps: any = {},
    props: Record<string, any> = {},
    overwrites: Record<string, any> = {}
): Promise<IComponent> {
    const instance = new component()
    await instance.create(props)

    Object.assign(instance, {
        ...metaProps,
        _name: component.name
    })

    Object.assign(instance, overwrites)

    Object.getOwnPropertyNames(instance).forEach((p) => {
        if (instance[p]?._injectable) {
            instance[p]._class.prototype._subscribers[component.name] = {
                read: instance[p]._read,
                write: instance[p]._write
            }
        }
    })

    return instance
}

function setMetadata(target: IComponent, props: Record<string, any> = {}) {
    target._parent = props._parent ?? {}
    target._id = props._id ?? null
    target._name = props._name ?? null
    target._key = props._key ?? null
}

function overwriteProps(target: IComponent, props: Record<string, any> = {}) {
    const compProperties = Object.getOwnPropertyNames(target)
    for (const property of compProperties) {
        if (props?.[property]) {
            target[property] = props[property]
        }
    }
}

export default build