/* eslint-disable */
import Handlebars from "handlebars";

class MyClass {
    constructor() {
        this.name = 'MyClass'
    }
}

// MyClass.prototype[Symbol.toStringTag] = '123'
// MyClass.prototype[Symbol.toPrimitive] = function(hint) {
//     console.log('123',hint)
//     return '123'
// }
MyClass.prototype.valueOf = function() {
    return '123'
}

const myClass = new MyClass()

// console.log(`${myClass}`)

const example = `
    <div>
        <h1>{{title}}</h1>
        <p>{{description}}</p>
        {{MyClass value=title}}
    </div>
`

const data = {
    title: "Hello World",
    description: "This is a test",
    MyClass: myClass
}

const template = Handlebars.compile(example)

const result = template(data)

console.log(result)
