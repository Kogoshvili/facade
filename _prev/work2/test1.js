import { html } from 'htm/react';

function ref(n) {
    this.value = n;
    this[Symbol.toPrimitive] = function (hint) {
        if (hint === "number") {
            return this.value;
        }
        if (hint === "string") {
            return this.value.toString();
        }
        return this;
    };
    return this;
}


function App() {
    const name = 'world';
    const number = new ref(1);

    const onClick = () => {
        number.value = number.value + 1;
    };

    return html`<div>
        <h1>Hello, ${number}!</h1>
        <button onClick=${onClick}>Click me</button>
    </div>`;
}

const res = App();
// console.log(App.toString());

// console.log(res);
// console.log(res.props.children[0]);
// console.log(res.props.children[1]);
res.props.children[1].props.onClick()
console.log(res.props.children[0].props.children[1]);

// stuff between <> and </> is the children
// stuff inside of <> is the props
