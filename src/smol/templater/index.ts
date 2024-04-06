import { nanoid } from 'nanoid'
import { components } from 'app/server'
import fp from 'lodash/fp';
import makeComponent from 'smol/factory';

function compileInstance(instance: any) {
    const methodMap = fp.flow(
        Object.getPrototypeOf,
        Object.getOwnPropertyNames,
        getPublicMethods(instance),
        buildMethodMap(instance)
    )(instance);

    return compile(instance.render(), {...instance}, methodMap, instance._name);
}

function compile(template: string, variables: Record<string, string>, methods: Record<string, string>, componentName?: string) {
    return template.replace(/\{\{(.+?)\}\}/g, (match: string, key: string) => {
        if (key.startsWith('>')) return resolveComponent(key, variables);
        return resolveVariable(key, variables, methods);
    }).replace(/<(\w+)/, defineComponent(variables, componentName));
}

function resolveComponent(key: string, variables: Record<string, string>): string {
    const [componentName, ...variableString] = key.replace('>', '').trim().split(' ');
    const component = components[componentName];

    if (!component) {
        throw new Error('Component ' + componentName + ' not found');
    }

    const componentProps = variableMap(variables)(variableString);

    const instance = makeComponent(component, componentProps);

    const methodMap = fp.flow(
        Object.getPrototypeOf,
        Object.getOwnPropertyNames,
        getPublicMethods(instance),
        buildMethodMap(instance)
    )(instance);

    return compile(instance.render(), {...instance}, methodMap, instance._name);
}

const variableMap = (variables: Record<string, string>) => (variableString: string[]) => variableString.reduce((acc, variable: string) => {
    const [key, value] = variable.split('=');
    acc[key] = variables[value] || null;
    return acc;
}, {} as Record<string, string | null>);

const getPublicMethods = (initialize: any) => (methods: string[]) =>
    methods.filter(m => typeof initialize[m] === 'function' && (m !== 'constructor' && m !== 'render'));

const buildMethodMap = (initialize: any) => (methods: string[]) =>
    methods.reduce((acc, m) => ({
        ...acc,
        [m]: `smol.onClick(event, '${initialize._name}.${m}')`
    }), {} as Record<string, string>);

function resolveVariable(key: string, variables: Record<string, string>, methods: Record<string, string>) {
    return {...variables, ...methods}[key] ?? '';
}

function defineComponent(variables: Record<string, string>, componentName = 'root') {
    return (match: string, tag: string) => {
        const state = JSON.stringify(variables)
        return `<${tag} smol="${componentName}.${nanoid(10)}" smol-state='${state}'`;
    }
}

export { compile, compileInstance }
