/* eslint-disable */

import Handlebars from "handlebars";

const example = `
    <div>
        <h1>{{title}}</h1>
        <p>{{description}}</p>
        {{> Component }}
    </div>
`

// const template = Handlebars.compile(example)

const data = {
    title: "Hello World",
    description: "This is a test"
}

// const result = template(data)

// console.log(result)

function MyCompiler() {
    Handlebars.JavaScriptCompiler.apply(this, arguments);
}
MyCompiler.prototype = new Handlebars.JavaScriptCompiler();

// Use this compile to compile BlockStatment-Blocks
MyCompiler.prototype.compiler = MyCompiler;

MyCompiler.prototype.nameLookup = function (parent, name, type) {
    console.log(parent, name, type);
    if (type === 'partial') {
        return this.source.functionCall('helpers.partialComponent', '', [
            parent,
            JSON.stringify(name),
        ]);
    }
    return Handlebars.JavaScriptCompiler.prototype.nameLookup.call(
        this,
        parent,
        name,
        type
    );
};

var env = Handlebars.create();
env.registerHelper('partialComponent', function (parent, name) {
    console.log(name);
    return '';
});

env.JavaScriptCompiler = MyCompiler;

env.registerPartial('component', '<div>Component</div>');


// var template = env.compile('{{#each Test}} ({{Value}}) {{/each}} {{> component}}');
// console.log(
//     template({
//         test: [{ value: 'a' }, { value: 'b' }, { value: 'c' }]
//     })
// );
var template = env.compile(example);
console.log(template(data));

