import { nanoid } from 'nanoid'
import { components } from 'app/server'

// function compile(template: string, variables: Record<string, string>, methods: Record<string, string>, componentName?: string) {
//     template = template.replace(/\{\{(.+?)\}\}/g, (match, key) => {
//         if (key.startsWith('>')) {
//             return resolveComponent(key);
//         }

//         return resolveVariable(key, variables, methods);
//     });

//     if (componentName !== 'root') {
//         template = template.replace(/<(\w+)/, (match: string, tag: string) => {
//             defineComponent(tag, variables, componentName);
//         });
//     }

//     return template;
// }

function compile(template: string, variables: Record<string, string>, methods: Record<string, string>, componentName?: string) {
    return template.replace(/\{\{(.+?)\}\}/g, (match, key) => {
        if (key.startsWith('>')) return resolveComponent(key, variables);
        return resolveVariable(key, variables, methods);
    }).replace(/<(\w+)/, defineComponent(variables, componentName));
}

function resolveComponent(key: string, variables: Record<string, string>) {
    const cleanString = key.replace('>', '').trim();
    const [componentName, ...variableString] = cleanString.split(' ');
    const component = components[componentName];

    if (!component) {
        throw new Error('Component ' + componentName + ' not found');
    }

    const componentProps = variableString.reduce((acc, variable: string) => {
        const [key, value] = variable.split('=');
        acc[key] = variables[value] || null;
        return acc;
    }, {} as Record<string, string | null>);

    const initialize = new component(componentProps);
    return initialize.render();
}

function resolveVariable(key: string, variables: Record<string, string>, methods: Record<string, string>) {
    return {...variables, ...methods}[key] ?? '';
}

function defineComponent(variables: Record<string, string>, componentName = 'root') {
    return (match: string, tag: string) => {
        const state = JSON.stringify(variables)
        return `<${tag} smol="${componentName}.${nanoid(10)}" smol-state='${state}'`;
    }
}

export { compile }
