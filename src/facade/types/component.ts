interface IComponent {
    _name?: string;
    _parent?: any;
    _id?: string;
    _viewPath?: string;
    _view?: () => string;
    [key: string]: any;
}

export default IComponent
