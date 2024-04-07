import { nanoid } from 'nanoid'
import { components, instanceTree } from 'app/server'
import fp from 'lodash/fp'
import makeComponent from 'smol/factory'
import Handlebars from 'handlebars'

interface IVariables {
    instance?: any
    properties?: Record<string, any>
    methods?: Record<string, string>
    extras?: {
        children?: Record<string, any>
        [key: string]: any
    }
}

export function renderInstance(instance: any, componentName: string, id?: string, props: Record<string, any> = {}) {
    const methodMap = getMethods(instance)
    const variables: IVariables = {instance, properties: {...instance}, methods: methodMap, extras: props}
    const template = instance.render()
    return renderTemplate(template, variables, componentName, id)
}

export function renderTemplate(template: string, variables: IVariables, componentName: string, id?: string) {
    const rendered = Handlebars.compile(template)({
        ...variables.properties, ...variables.methods, ...variables.extras,
        instance: variables.instance,
    })
    return rendered.replace(/<(\w+)/, defineComponent({...variables.properties, ...variables.extras}, componentName, id))
}

export function registerPartials(components: Record<string, any>) {
    for (const [name, _component] of Object.entries(components)) {
        Handlebars.registerPartial(name, renderPartial)
    }
}

export function renderPartial(data: Record<string, any>, options?: any) {
    const component = components[options.name]
    let instance: any = null
    const newId = nanoid(10)

    if (options.data?._parent?.root?.instance) {
        const parentObj = options.data._parent.root
        if (instanceTree[parentObj.name]) {
            const parent = instanceTree[parentObj.name].find((i: any) => i.id === parentObj.id)
            if (parent)  {
                const child = parent.children[options.name].find((i: any) => !i.used)
                if (child) {
                    instance = child.instance
                    child.used = true
                }
            }
        }
    }

    if (!instance) {
        if (instanceTree[options.name] && instanceTree[options.name].length) {
            const obj = instanceTree[options.name].find((i: any) => !i.used)
            if (obj) {
                instance = obj.instance
                obj.used = true
            }
        }
    }

    if (!instance) {
        instance = makeComponent(component, {
            parent: options.data?._parent?.root?.instance ?? null,
            id: newId,
            name: options.name,
        }, options.hash)
    }

    // create object that consists of properties of data object excluding numeric keys
    const newData = Object.keys(data).reduce((acc, key) => isNaN(parseInt(key)) ? {...acc, [key]: data[key]} : acc, {})
    return renderInstance(instance, options.name, newId, newData)
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
    const cleanVariables = {...variables}
    delete cleanVariables.id
    delete cleanVariables.name
    delete cleanVariables.parent
    const state = JSON.stringify(cleanVariables)
    return `<${tag} smol="${componentName}.${id ?? nanoid(10)}" smol-state='${state}'`
}
