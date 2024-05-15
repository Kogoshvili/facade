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

function getElement() {
    return document.getElementById(`${this._name}.${this._id}`) ?? null
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
    instance.getElement = getElement.bind(instance)

    instance.effects ??= []
    instance.render ??= render.bind(instance)

    // static _anonymous: {[key: string]: ((...args: any) => void)[]} = {}

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
    _key: string | Nil
    _parent: { name: string, id: string } | Nil
    _parentInstance: Component | null

    effects: effect[]

    parent(): Component | null
    getElement(): Element | null

    recived(props: P): void
    created(): Promise<void> | void
    mounted(): Promise<void> | void
    destroying(): Promise<void> | void
    renderd(element: Element): Promise<void> | void

    render(): any
}

// eslint-disable-next-line @typescript-eslint/ban-types
// abstract class FComponent<P = {}, D = any > {
//     _name: string | null = null
//     _id: string | null = null
//     _key: string | null = null
//     _parent: { name: string, id: string } | null = null
//     _parentInstance: FComponent | null = null

//     static _anonymous: {[key: string]: ((...args: any) => void)[]} = {}

//     effects: any[] = []

//     parent(): D | null {
//         if (!this._parent) {
//             return null
//         }

//         if (!this._parentInstance) {
//             const vertex = getNode({ name: this._parent.name, id: this._parent.id })
//             this._parentInstance = rebuildInstance(vertex!).instance
//         }

//         return this._parentInstance as D
//     }

//     getElement() {
//         return document.getElementById(`${this._name}.${this._id}`)
//     }

//     // Executes every time component recieves new props
//     recived(props: P) {}

//     // Executes every time the component is created
//     callExpressions() {}

//     // Executes once for every new instance
//     async created() {}

//     // Executes everytime instance is created
//     async mounted() {}

//     // Client side only, executes everytime the component is rendered
//     renderd(element: Element) {}

//     // Executes everytime instance is destroyed
//     async destroying() {}

//     // Executes every time the component is rendered
//     render(this: any): any {
//         return null
//     }

//     [key: string]: any
// }
