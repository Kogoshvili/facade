import { getNode, rebuildInstance } from './ComponentGraph'

// eslint-disable-next-line @typescript-eslint/ban-types
abstract class FComponent<P = {}, D = any > {
    _name: string | null = null
    _id: string | null = null
    _key: string | null = null
    _parent: { name: string, id: string } | null = null
    _parentInstance: FComponent | null = null

    static _anonymous: {[key: string]: ((...args: any) => void)[]} = {}

    effects: any[] = []

    parent(): D | null {
        if (!this._parent) {
            return null
        }

        if (!this._parentInstance) {
            const vertex = getNode({ name: this._parent.name, id: this._parent.id })
            this._parentInstance = rebuildInstance(vertex!).instance
        }

        return this._parentInstance as D
    }

    getElement() {
        return document.getElementById(`${this._name}.${this._id}`)
    }

    // Executes every time component recieves new props
    recived(props: P) {}

    // Executes every time the component is created
    callExpressions() {}

    // Executes once for every new instance
    async created() {}

    // Executes everytime instance is created
    async mounted() {}

    // Client side only, executes everytime the component is rendered
    renderd(element: Element) {}

    // Executes everytime instance is destroyed
    async destroying() {}

    // Executes every time the component is rendered
    render(this: any): preact.JSX.Element | null {
        return null
    }

    [key: string]: any
}

export { FComponent }
