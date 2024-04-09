import { nanoid } from 'nanoid'
import { components } from 'app/server'
import fp from 'lodash/fp'
import makeComponent from 'facade/factory'
import Handlebars from 'handlebars'
import recreateInstancesA from './instance-recreator'

interface IVariables {
    instance?: any
    properties?: Record<string, any>
    methods?: Record<string, string>
}

enum UseState {
    Unused,
    InUse,
    Used
}

let instanceTree: Record<string, any> = {}

export function getInstanceTree() {
    return instanceTree
}

export function resetInstanceTree() {
    instanceTree = {}
}

export function rebuildInstanceTree(json: string) {
    if (!json) return
    instanceTree = JSON.parse(json)
}

export function recreateInstances() {
    instanceTree = recreateInstancesA(instanceTree)
}

export function getCleanInstanceTree() {
    const tree = {...instanceTree}

    for (const key in tree) {
        tree[key] = tree[key].filter((i: any) => i.state !== UseState.Unused)
        tree[key] = tree[key].map((i: any) => {
            i.properties = removeHiddenProperties(i.instance)
            i.state = UseState.Unused
            i.instance = null
            return i
        })
    }

    return tree
}

export function jsonInstanceTree() {
    const tree = getCleanInstanceTree()
    return JSON.stringify(tree)
}

export function getInstance(name: string, id: string) {
    return instanceTree[name].find((i: any) => i.id === id)
}

export function registerPartials(components: Record<string, any>) {
    for (const [name] of Object.entries(components)) {
        Handlebars.registerPartial(name, renderPartial)
    }
}

export function renderInstance(instance: any) {
    const methodMap = getMethods(instance)
    const variables: IVariables = {
        instance,
        properties: {...instance},
        methods: methodMap
    }
    const template = instance._view()
    return renderTemplate(template, variables)
}

export function renderTemplate(template: string, variables: IVariables = {}) {
    const instance = variables.instance ?? {}

    const rendered = Handlebars.compile(template)({
        ...variables.properties,
        ...variables.methods,
        ...(variables.instance ? { _instance: variables.instance } : {})
    })

    return rendered.replace(/<(\w+)/, defineComponent(instance._name, instance._id))
}

export function renderPartial(_data: Record<string, any>, options?: any) {
    const component = components[options.name]

    if (instanceTree[options.name]) {
        instanceTree[options.name].filter((i: any) => i.state === UseState.InUse).forEach((i: any) => i.state = UseState.Used)
        const unused = instanceTree[options.name].find((i: any) => i.state === UseState.Unused)

        if (unused) {
            unused.state = UseState.InUse

            if (!unused.instance) {
                const instance = makeComponent(component, {
                    _parent: options.data?.root?._instance ?? null,
                    _id: unused._id,
                    _name: unused._name,
                }, options.hash)
                unused.instance = instance
            }

            unused.instance.__updateProps(options.hash)

            return renderInstance(unused.instance)
        }
    }

    const newId = nanoid(10)

    const instance = makeComponent(component, {
        _parent: options.data?.root?.instance ?? null,
        _id: newId,
        _name: options.name,
    }, options.hash)

    instanceTree[options.name] = instanceTree[options.name] ?? []
    instanceTree[options.name].push({
        id: instance._id,
        name: instance._name,
        instance,
        parent: options.data?.root?._instance ? {
            name: options.data?.root?._name,
            id: options.data?.root?._id
        } : null,
        state: UseState.InUse
    })

    instance.mount?.()

    return renderInstance(instance)
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
        [m]: `facade.onClick(event, '${initialize._name}.${initialize._id}.${m}')`
    }), {} as Record<string, string>)

const defineComponent = (componentName = 'root', id?: string) => (_match: string, tag: string) => {
    return `<${tag} facade="${componentName}.${id ?? 0}"'`
}

export const removeHiddenProperties = (props: any) => {
    const newProps = {...props}

    for (const key in newProps) {
        if (key.startsWith('_')) {
            delete newProps[key]
        }
    }

    return newProps
}