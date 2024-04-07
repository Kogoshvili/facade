import { nanoid } from 'nanoid'
import { components } from 'app/server'
import fp from 'lodash/fp'
import makeComponent from 'smol/factory'
import Handlebars from 'handlebars'

interface IVariables {
    properties?: Record<string, any>
    methods?: Record<string, string>
    extras?: Record<string, any>
}

export function renderInstance(instance: any, componentName: string, id?: string, props: Record<string, any> = {}) {
    const methodMap = getMethods(instance)
    const variables: IVariables = {properties: {...instance}, methods: methodMap, extras: props}
    const template = instance.render()
    return renderTemplate(template, variables, componentName, id)
}

export function renderTemplate(template: string, variables: IVariables, componentName: string, id?: string) {
    const rendered = Handlebars.compile(template)({...variables.properties, ...variables.methods, ...variables.extras})
    return rendered.replace(/<(\w+)/, defineComponent(variables.properties, componentName, id))
}

export const renderPartialWithInstance = (instance: any, id?: string) => (_data: Record<string, any>, options?: any) => {
    const componentName = options. name
    return renderInstance(instance, componentName, id)
}

export function registerPartials(components: Record<string, any>) {
    for (const [name, _component] of Object.entries(components)) {
        Handlebars.registerPartial(name, renderPartial)
    }
}

export function renderPartial(data: Record<string, any>, options?: any) {
    const component = components[options.name]
    const instance = makeComponent(component, {}, options.hash)

    if (data[options.name]) {
        const { state, id } = data[options.name].pop()
        return renderInstance(instance, options.name, id, state)
    }

    return renderInstance(instance, options.name)
}

const getMethods = (instance: any) => fp.flow(
    Object.getPrototypeOf,
    Object.getOwnPropertyNames,
    getPublicMethods(instance),
    buildMethodMap(instance)
)(instance)

const getPublicMethods = (initialize: any) => (methods: string[]) =>
    methods.filter(m => typeof initialize[m] === 'function' && (m !== 'constructor' && m !== 'render'))

const buildMethodMap = (initialize: any) => (methods: string[]) =>
    methods.reduce((acc, m) => ({
        ...acc,
        [m]: `smol.onClick(event, '${initialize._name}.${m}')`
    }), {} as Record<string, string>)

const defineComponent = (variables: Record<string, string> = {}, componentName = 'root', id?: string) => (_match: string, tag: string) => {
    const state = JSON.stringify(variables)
    return `<${tag} smol="${componentName}.${id ?? nanoid(10)}" smol-state='${state}'`
}
