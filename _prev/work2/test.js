import { createElement } from 'react';

class MyComponent {
    constructor(props) {
        this.value = props.value;
    }

    preRender() {}
    postRender() {}

    onClick() {
        this.value = this.value + 1;
    }

    render() {
        const value = this.value;
        // return (
        //     <div>
        //         <h1>Hello: {value}</h1>
        //         <button onClick={() => this.onClick()}>Click me</button>
        //     </div>
        // )

        return createElement(
            "div",
            null,
            createElement(
                "h1",
                null,
                "Hello: ",
                value
            ),
            createElement(
                "button",
                {
                    onClick: function onClick() {
                        return this.onClick();
                    }
                },
                "Click me"
            )
        );
    }
}

// return html`<div>
// <h1>Hello: ${value}</h1>
// <button onClick=${() => this.onClick()}>Click me</button>
// </div>`;

const comp = new MyComponent({ value: 1 });
const res1 = comp.render();
// console.log(res1);
comp.children = {};
comp.name = 'MyComponent';
const str = renderToString(res1);
console.log(str);

function renderToString(node) {
    if (typeof node === 'string' || typeof node === 'number') {
        return node;
    }

    const props = node.props || {};
    const children = [props.children] || [];
    const attrs = Object.keys(props)
        .map(key => {
            if (key === 'children') {
                return '';
            }

            if (typeof props[key] === 'function') {
                comp.children[key] = props[key];
            }

            const functionLink = `${comp.name}.children.${key}()`;

            return `${key.toLocaleLowerCase()}="${functionLink}"`;
        })
        .join(' ');

    const childrenStr = children.flat().map(child => renderToString(child)).join('');

    return `<${node.type} ${attrs}>${childrenStr}</${node.type}>`;
}
