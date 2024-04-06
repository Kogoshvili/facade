import Component from "../../utils/component.js";

class ChildComponent extends Component {
    static _viewPath = 'ChildComponent';
    static _name = 'ChildComponent'

    constructor(props) {
        super(props);
    }

    onClick() {
        console.log('onClick')
    }

    render() {
        const absolutePath = `C:/projects/FS-Framework/controller/${this.constructor._name}/${this.constructor._viewPath}.html`
        return this.view(absolutePath);
    }
}

export default ChildComponent;



