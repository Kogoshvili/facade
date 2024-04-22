import { getNode, rebuildInstance } from './ComponentGraph'

// eslint-disable-next-line @typescript-eslint/ban-types
abstract class AComponent<P = {}, D = any > {
    // #region preact.Component
    props: any = {}
    state: any = {}
    context: any = {}
    setState: (state: any) => void = () => {}
    forceUpdate: () => void = () => {}
    render: () => preact.JSX.Element | null = () => null
    // #endregion

    _name: string | null = null
    _parent: { name: string, id: string } | null = null
    _parentInstance: AComponent | null = null
    _id: string | null = null
    _key: string | null = null

    static _anonymous: {[key: string]: ((...args: any) => void)[]} = {}

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

    // Executes every time the component is created
    recived(props: P) {
    }

    // Executes once for every new instance
    async created() {
        // Depends on input
    }

    // TODO: Implement?
    // async propsChanged() {}

    // Executes before render if rendering is needed
    async mounted() {
        // Depends on input
    }

    // Executes after render if rendering was needed
    async unmounted() {
        // Depends on input
    }

    // executes exactly before render if rendering was needed
    async beforeRender() {
        // Depends on input
    }

    // executes exactly after render if rendering was needed
    async afterRender() {
        // Depends on input
    }

    // Executes every time the component is rendered
    static render(this: any): preact.JSX.Element | null {
        return null
    }

    [key: string]: any
}

export { AComponent }
