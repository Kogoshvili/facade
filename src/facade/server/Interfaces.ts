export interface IComponentNode {
    id: string
    name: string
    key: string | number | null

    instance: IComponent | null

    props: Record<string, any>
    properties: Record<string, any>
    methods: string[]

    parent: { name: string, id: string } | null
    hasChildren: boolean

    needsRender: boolean
    haveRendered: boolean

    prevRender: string | null
}

// export interface IComponentNodeJSON {
//     id: string
//     name: string
//     key: string | number | null
//     instance: null // set to null after render
//     props: Record<string, any>
//     properties: Record<string, {
//         hash: string
//         value: any
//     }>
//     methods: string[]
//     parent: { name: string, id: string } | null
//     hasChildren: boolean
//     needsRender: false
//     template: preact.JSX.Element | null
//     prevRender: string | null
// }


export interface IComponent {
    _view: string | null;
    _viewPath: string | null;
    _name: string;
    _parent: { name: string, id: string } | null
    _parentInstance: IComponent | null;
    _id: string;
    _key: string | null;
    parent: () => IComponent | null;
    mount: () => void;
    render: () => preact.JSX.Element;
    onPropsChanged: () => void;
    [key: string]: any;
}
