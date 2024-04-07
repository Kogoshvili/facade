
interface Component {
    _name: string;
    _viewPath: string;
    render: () => string;
    [key: string]: any;
}

export default Component
