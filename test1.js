/* eslint-disable */
import Handlebars from "handlebars";

Handlebars.registerHelper('loud', function (aString) {
    return aString.toUpperCase()
})

let counter = 0

Handlebars.registerPartial('MyComponent', function(data, options) {
    console.log(options.name, options.hash)
    return '<div>MyComponent {{ value }}</div>'
})

// Handlebars.registerPartial('MyComponent', '<div>MyComponent {{ value }}</div>')


// const example = `
//     <div>
//         <h1>{{title}}</h1>
//         <p>{{description}}</p>
//         {{loud description}}
//         {{> MyComponent value=title}}
//     </div>
// `


// const data = {
//     title: "Hello World",
//     description: "This is a test"
// }


// const template = Handlebars.compile(example)

// const result = template(data)

// console.log(result)

const template2 = Handlebars.compile(`{{> MyComponent value=title}}`)

const result2 = template2({ title: 'Hello World' })
console.log(result2)
