import Component from "../../utils/component.js";

class MyComponent extends Component {
    static _viewPath = 'MyComponent';
    static _name = 'MyComponent'
    value;

    constructor(props) {
        super(props);
        this.value = 0;
    }

    onClick() {
        this.value++;
    }

    render() {
        const absolutePath = `C:/projects/FS-Framework/controller/${MyComponent._name}/${MyComponent._viewPath}.html`
        return this.view(absolutePath);
    }
}

export default MyComponent



