import fs from "fs";
import { compile } from "../templater.js";

class Component {
    constructor(props) {

    }

    view(absolutePath = '', data = {}) {
        const source = fs.readFileSync(absolutePath, 'utf8')
        // get all methods from this
        const rawMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
        const methods = rawMethods.filter(m => m !== 'constructor' && m !== 'render' && m !== 'view');
        const methodMap = methods.reduce((acc, m) => {
            acc[m] = `smol.onClick(event, '${this.constructor._name}.${m}')`;
            return acc;
        }, {});

        return compile(source, {...data, ...this}, methodMap, this.constructor._name);
    }
}

export default Component;


// write Component decorator that takes view path as argument
