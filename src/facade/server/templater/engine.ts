import { cloneDeep, get } from 'lodash-es'
import fp from 'lodash/fp'
import makeComponent from '../utils/factory'
import { components } from '../index'

enum UseState {
    Unused,
    InUse,
    Used
}

export let instanceTree: any = {}

export const resetInstanceTree = () => {
    instanceTree = {}
}

export const getCleanInstanceTree = () => {
    const tree = cloneDeep(instanceTree)

    for (const key in tree) {
        tree[key] = tree[key].filter((i: any) => i.state !== UseState.Unused)
        tree[key] = tree[key].map((i: any) => {
            i.properties = removeHiddenProperties(i.instance)
            i.state = UseState.Unused
            i.instance = null
            i.parent = i.parent ?? null
            i.children = []
            return i
        })
    }

    return tree
}

export const resetStateOfInstanceTree = () => {
    for (const key in instanceTree) {
        instanceTree[key].forEach((i: any) => i.state = UseState.Unused)
    }
}

export function rebuildInstanceTree(json: string) {
    instanceTree = JSON.parse(json)
}

export function recreateInstances() {
    function resolveInstance(instance: any) {
        if (instance.parent !== null) {
            // find the parent instance
            const parentInstance = instanceTree[instance.parent.name].find((parent: any) => parent.id === instance.parent.id)
            // check if the parent instance exists
            if (parentInstance) {
                // check if the parent instance has an instance
                if (parentInstance.instance === null) {
                    resolveInstance(parentInstance)
                } else {
                    instance.instance = makeComponent(components[instance.name], {
                        _parent: parentInstance.instance,
                        _id: instance.id,
                        _name: instance.name,
                    }, instance.properties)
                    instance.properties = removeHiddenProperties(instance.instance)
                }
            }
        } else {
            instance.instance = makeComponent(components[instance.name], {
                _parent: null,
                _id: instance.id,
                _name: instance.name,
            }, instance.properties)
            instance.properties = removeHiddenProperties(instance.instance)
        }
    }

    // loop through the keys of the tree
    for (const component in instanceTree) {
        // loop through the instances of the key
        for (const instance of instanceTree[component]) {
            resolveInstance(instance)
        }
    }
}

export function executeMethodOnTree(componentName: string, componentId: string, method: string, parameters: any) {
    const instance = instanceTree[componentName].find((i: any) => i.id === componentId)
    const methodResult = instance.instance[method](parameters)

    return methodResult
}

export default class Templater {
    onMatch: any
    postComponent: any
    noMount: any

    constructor(props: any) {
        this.noMount = props.noMount ?? false
        this.onMatch = props.onMatch
        this.postComponent = props.postComponent
    }

    async render(template: string, data: Record<string, any>, parent = null) {
        const regex = RegExp(/{{\s*([\s\S]+?)\s*}}/g)
        let context = template
        let match // ["{{> ProductList }}", "> ProductList"] groups, index, input

        while ((match = regex.exec(context)) !== null) {
            const start = match.index
            const isHelper = match[0].startsWith('{{#')
            const helperTag = match[1].split(' ')[0].trim().replace('#', '/')
            const helperBlockEndIndex = context.indexOf(`{{${helperTag}}}`, start)
            const end = !isHelper ? start + match[0].length : helperBlockEndIndex

            const callbackResult = await this.onMatch?.(match[1], start, context, parent)
            if (callbackResult) return callbackResult

            const replace = await this.replacer(match[1], start, context, data, parent)

            context = context.slice(0, start) + replace + context.slice(end)
        }

        return context
    }

    async replacer(match: string, offset: number, content: string, data: any, parent: any): Promise<string> {
        const param = match.trim()

        if (param.startsWith('/')) {
            return ''
        }

        if (param === 'self') {
            return JSON.stringify(data)
        }

        if (param.startsWith('#')) {
            return await this.handleHelper(param, content, offset, data, parent)
        }

        if (param.startsWith('>')) {
            return await this.handleComponent(param, data, parent)
        }

        if (param.includes('.') || param.includes('[')) {
            return get(data, param)
        }

        return data[param]
    }

    async handleComponent(param: string, data: any, parent: any) {
        const [compName, ...rawProps] = param.replace('>', '').trim().split(' ')
        const props = rawProps.reduce((acc: Record<string, any>, item: string) => {
            const [key, value] = item.split('=')
            acc[key] = getValue(data, value)
            return acc
        }, {})

        const instance = await getInstance(compName, props, parent)
        const methods = getMethods(instance)

        this.postComponent?.(instance, parent)

        let template = instance.render()
        template = template.replace(/<(\w+)/, (_match: string, tag: string) => `<${tag} facade="${instance._name}.${instance._id ?? 0}"'`)

        return await this.render(template, {...instance, ...methods}, instance as any)
    }

    async handleHelper(param: string, content: string, offset: number, data: any, parent: any): Promise<string> {
        const [helper, ...rawParams] = param.replace('#', '').trim().split(' ')
        const params = [rawParams].flat().map((param: any) => getValue(data, param)).flat()

        if (helper === 'each') {
            const endEachBlock = content.indexOf('{{/each}}', offset)
            const eachBlock = content.slice(offset, endEachBlock + 9)
            const childBlock = eachBlock.slice(eachBlock.indexOf('}}') + 2, eachBlock.lastIndexOf('{{'))
            const result = await Promise.all(params.map(async (p: any) => await this.render(childBlock, p, parent)))
            return result.join('')
        }

        if (helper === 'if') {
            const endIfBlock = content.indexOf('{{/if}}', offset)
            const ifBlock = content.slice(offset, endIfBlock + 7)
            const childBlock = ifBlock.slice(ifBlock.indexOf('}}') + 2, ifBlock.lastIndexOf('{{'))
            return params[0] ? await this.render(childBlock, data, parent) : ''
        }

        return ''
    }
}

async function getInstance(compName: string, state: any, parent: any) {
    const component = components[compName]
    let instance = null

    if (instanceTree[compName]) {
        instanceTree[compName].filter((i: any) => i.state === UseState.InUse).forEach((i: any) => i.state = UseState.Used)
        const unused = instanceTree[compName].find((i: any) => i.state === UseState.Unused)

        if (unused) {
            unused.state = UseState.InUse

            if (!unused.instance) {
                const instance = makeComponent(component, {
                    _parent: parent ?? null,
                    _id: unused._id,
                    _name: unused._name,
                }, state)
                unused.instance = instance
            }

            unused.instance.__updateProps(state)
            instance = unused.instance
        }
    }

    if (!instance) {
        const newInstance = makeComponent(component, {
            _parent: parent ?? null,
            _name: compName,
        }, state)

        instance = newInstance

        instanceTree[compName] = instanceTree[compName] ?? []
        instanceTree[compName].push({
            id: instance._id,
            name: instance._name,
            instance: newInstance,
            properties: removeHiddenProperties(instance),
            parent: parent ? { name: parent._name, id: parent._id } : null,
            state: UseState.InUse,
            children: []
        })

        await instance.mount?.()
    }

    return instance
}

function getValue(data: any, value: string) {
    const valueIsParam = value.startsWith('{') && value.endsWith('}')

    if (valueIsParam) {
        value = value.slice(1, -1)

        if (value === 'self') {
            return data
        }

        if (value.startsWith('"') || value.startsWith('\'')) {
            return value.slice(1, -1)
        }

        if (!isNaN(value as any)) {
            return Number(value)
        }

        if (value.includes('.') || value.includes('[')) {
            return get(data, value)
        }
    }

    return data[value]
}

const getMethods = (instance: any) => fp.flow(
    Object.getPrototypeOf,
    Object.getOwnPropertyNames,
    getPublicMethods(instance),
    buildMethodMap(instance)
)(instance)

const specialMethods = ['mount', 'prerender', 'render']

const getPublicMethods = (initialize: any) => (methods: string[]) =>
    methods.filter(m =>
        typeof initialize[m] === 'function' &&
        (m !== 'constructor' && m !== 'render') &&
        !m.startsWith('_') &&
        !specialMethods.includes(m)
    )

const buildMethodMap = (initialize: any) => (methods: string[]) =>
    methods.reduce((acc, m) => ({
        ...acc,
        [m]: `facade.onClick(event, '${initialize._name}.${initialize._id}.${m}')`
    }), {} as Record<string, string>)

const removeHiddenProperties = (props: any) => {
    const newProps = { ...props }

    for (const key in newProps) {
        if (key.startsWith('_')) {
            delete newProps[key]
        }
    }

    return newProps
}
