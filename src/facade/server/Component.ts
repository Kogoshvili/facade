import { getComponentInstanceFromGraph } from './ComponentManager'

// eslint-disable-next-line @typescript-eslint/ban-types
abstract class AComponent<P = {}> {
    props: any

    _view: string | null = null
    _viewPath: string | null = null
    _name: string | null = null
    _parent: { name: string, id: string } | null = null
    _parentInstance: AComponent | null = null
    _id: string | null = null
    _key: string | null = null

    static _anonymous: {
        [key: string]: ((...args: any) => void)[]
    } = {}

    constructor(props: P) {
        this.props = props
    }

    mount(): void {}

    static render(this: any): preact.JSX.Element | null {
        return null
    }

    parent(): AComponent | null {
        if (!this._parent) {
            return null
        }

        if (!this._parentInstance) {
            this._parentInstance = getComponentInstanceFromGraph(this._parent.name, this._parent.id) as any
        }

        return this._parentInstance
    }

    [key: string]: any
}

export { AComponent }
