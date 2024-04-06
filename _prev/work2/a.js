function updateProperties(temp, props) {
    const compProperties = Object.getOwnPropertyNames(temp);
    for (const property of compProperties) {
        if (props[property]) {
            temp[property] = props[property];
        }
    }
    return temp;
}

function Component(comp) {
    return function (props) {
        const temp = new comp(props);

        if (!props) return temp;
        return updateProperties(temp, props);
    };
}
class MyComponent {
    value = 0;

    constructor(props) {
        this.value = 0;
    }

    onClick() {
        this.value++;
    }
}

const c = Component(MyComponent);

const comp = c();
comp.onClick();
console.log(comp.value); // 1

const comp2 = c({ value: 1 });
comp2.onClick();
console.log(comp2.value); // 2

const comp3 = c({ value: 10 });
comp3.onClick();
console.log(comp3.value); // 11


// const comp = new MyComponent();
// console.log(comp.value); // 0
// comp.onClick();
// console.log(comp.value); // 1

// const comp2 = new MyComponent({ value: 1});
// console.log(comp2.value); // 1
// comp.onClick();
// console.log(comp2.value); // 2
