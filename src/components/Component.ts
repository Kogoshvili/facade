import { getNode, rebuildInstance } from 'ComponentGraph'

function parent() {
    if (!this._parent) {
        return null
    }

    if (!this._parentInstance) {
        const vertex = getNode({ name: this._parent.name, id: this._parent.id })
        this._parentInstance = rebuildInstance(vertex!).instance
    }

    return this._parentInstance
}

function render() {
    return null
}

export function toComponent(instance: any, { name, id, key }: { name: string, id: string, key?: string}) {
    instance._name = name
    instance._id = id
    instance._key = key
    instance._parent = { name, id }

    instance.parent = parent.bind(instance)

    instance.effects ??= []
    instance.render ??= render.bind(instance)

    instance.recived ??= (props: any) => {}
    instance.created ??= async () => {}
    instance.mounted ??= async () => {}
    instance.renderd ??= async () => {}
    instance.destroying ??= async () => {}

    return instance
}

type signal = any
type effect = (() => void) | [() => void, signal[]]

export interface Component<P = {}> {
    _name: string
    _id: string
    _key: string | null | undefined
    _parent: { name: string, id: string } | null | undefined
    _parentInstance: Component | null

    effects: effect[]

    parent(): Component | null
    getElement(): Element | null

    recived(props: P): void
    created(): Promise<void> | void
    mounted(): Promise<void> | void
    destroying(): Promise<void> | void
    renderd(element: Element): Promise<void> | void

    script?: () => Promise<void> | void

    render(): any
}
