import { AComponent } from './Component'

export interface IComponentDeclaration {
    name: string
    declaration: (new () => AComponent<any>) & AComponent<any>
}

export interface IComponentNode {
    name: string
    id: string
    key: string | number | null
    xpath: string | null
    instance: AComponent | null
    props: Record<string, any>
    properties: Record<string, any>
    needsRender: boolean
    haveRendered: boolean
    prevRender: string | null
}

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
