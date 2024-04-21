import { signal } from './src/facade/server/Signals'

class MyComponent {
    isDone = signal(true)
    todo

    constructor(todo) {
        this.todo = todo
    }

    log() {
        console.log(`Todo: ${this.todo} \nDone: ${this.isDone()}`)
    }
}

// const component1 = new MyComponent('todo1')
// component1.log()
// // const jsoned = JSON.stringify(component1)
// // console.log(jsoned)

// function recreate(oldProps) {
//     const props = {}
//     for (const key in oldProps) {
//         if (typeof oldProps[key] === 'object') {
//             if (oldProps[key].__type === 'signal') {
//                 props[key] = signal(oldProps[key].value)
//                 continue
//             }
//         }
//         props[key] = oldProps[key]
//     }

//     return props
// }

// const props2 = recreate(JSON.parse('{"isDone":{"__type":"signal","value":true},"todo":"todo2"}'))
// Object.assign(component1, props2)

// component1.log()

const methods = Object.getOwnPropertyNames(MyClass.prototype)
    .filter((m) => m !== 'constructor');
const properties = Object.getOwnPropertyNames(MyComponent).filter((m) => typeof MyComponent[m] !== 'function')
console.log(methods, properties)
