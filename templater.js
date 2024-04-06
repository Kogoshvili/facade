import { v4 as uuidv4 } from 'uuid';

const components = {
};

function compile(template, variables, methods, name) {
    template = template.replace(/\{\{(.+?)\}\}/g, (match, key) => {
        // console.log(match, key);
        // {{value}} value
        // {{value}} value
        // {{> ChildComponent value=value }} > ChildComponent value=value

        // if starts with > then it is a component
        if (key.startsWith('>')) {
            const cleanString = key.replace('>', '').trim();

            // extract component name and variables
            const [componentName, ...variableString] = cleanString.split(' ');

            const component = components[componentName];
            if (!component) {
                throw new Error('Component ' + componentName + ' not found');
            }

            const componentProps = variableString.reduce((acc, variable) => {
                const [key, value] = variable.split('=');
                acc[key] = variables[value] || null;
                return acc;
            }, {});

            const initialize = new component(componentProps);
            return initialize.render();
        }

        return {...variables, ...methods}[key] ?? '';
    });


    if (name !== 'root') {
        const state = JSON.stringify(variables)
        // add id to wrappper tag
        template = template.replace(/<(\w+)/, (match, tag) => {
            return `<${tag} smol="${name}.${uuidv4()}" smol-state='${state}'`;
        });
    }

    return template;
}

// const example = `
// <div>
//     <h1>MyComponent</h1>
//     <h3>{{value}}</h3>{{value}}
//     {{> ChildComponent value=value }}
// </div>
// `

// const variables = {
//     value: 1
// }

// console.log(compile(example, variables));


function registerComponent(name, component) {
    components[name] = component;
}

function registerComponents(components) {
    for (var name in components) {
        registerComponent(name, components[name]);
    }
}

export {
    compile,
    registerComponent,
    registerComponents
}
