import Component from "../../utils/component.js";

class Index extends Component {
    static _viewPath = 'Index';
    static _name = 'Index'

    constructor(props) {
        super(props);
    }

    render() {
        const absolutePath = `C:/projects/FS-Framework/controller/${MyComponent._name}/${MyComponent._viewPath}.html`
        return this.view(absolutePath);
    }
}

export default Index



