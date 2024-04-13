import { get } from 'lodash-es'
import { getBuiltComponentNode, getComponentNodeProperties, getMethods } from './ComponentManager'
import { IComponentNode } from './Interfaces'

export default class Templater {
    onMatch: any
    postComponent: any
    noMount: any

    constructor(props: any) {
        this.noMount = props.noMount ?? false
        this.onMatch = props.onMatch
        this.postComponent = props.postComponent
    }

    async render(template: string, data: Record<string, any>, parent: IComponentNode | null = null) {
        const regex = RegExp(/{{\s*([\s\S]+?)\s*}}/g)
        let context = template
        let match // ["{{> ProductList }}", "> ProductList"] groups, index, input

        while ((match = regex.exec(context)) !== null) {
            const start = match.index
            const isHelper = match[0].startsWith('{{#')
            const helperTag = match[1].split(' ')[0].trim().replace('#', '/')
            const helperBlockEndIndex = context.indexOf(`{{${helperTag}}}`, start)
            const end = !isHelper ? start + match[0].length : helperBlockEndIndex

            const replace = await this.replacer(match[1], start, context, data, parent)

            context = context.slice(0, start) + replace + context.slice(end)
        }

        return context
    }

    async replacer(match: string, offset: number, content: string, data: Record<string, any>, parent: IComponentNode | null = null): Promise<string> {
        const param = match.trim()

        if (param === 'handleAdd') {
            console.log('')
        }

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

    async handleComponent(param: string, data: Record<string, any>, parent: IComponentNode | null = null): Promise<string> {
        const [compName, ...rawProps] = param.replace('>', '').trim().split(' ')
        if (data === undefined) {
            console.log('data is undefined')
        }
        const props = rawProps.reduce((acc: Record<string, any>, item: string) => {
            const [key, value] = item.split('=')
            acc[key] = getValue(data, value)
            return acc
        }, {})

        const componentNode = await getBuiltComponentNode(compName, props, parent)

        if (!componentNode) {
            return ''
        }

        if (componentNode.instance === null) {
            if (componentNode.hasChildren) {
                const methodsMap = buildMethodMap({_name: componentNode.name, _id: componentNode.id})(componentNode.methods)
                return await this.render(
                    componentNode.template!,
                    {...getComponentNodeProperties(componentNode), ...methodsMap},
                    componentNode
                )
            }

            return componentNode.prevRender ?? ''
        }

        const instance = componentNode.instance

        const methodsMap = buildMethodMap(instance)(getMethods(instance))
        const template = instance.render().replace(/<(\w+)/, defineComponent(instance))
        componentNode.template = template

        let result = await this.render(template, {...instance, ...methodsMap}, componentNode as any)

        result = result.replace(/@(\w+)(:\w+)?="(.*?)"/g,
            (_: string, event: string, mode: string = ':default', method: string) =>
                `data-facade-event="${event}.${mode?.replace(':', '')}.${instance._name}.${instance._id}.${method}" id="${instance._name}.${instance._id}"`
        )

        componentNode.prevRender = result

        return result
    }

    async handleHelper(param: string, content: string, offset: number, data: Record<string, any>, parent: IComponentNode | null = null): Promise<string> {
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

const buildMethodMap = (initialize: { _name: string, _id: string }) => (methods: string[]) =>
    methods.reduce((acc, m) => ({
        ...acc,
        [m]: `facade.event(event, '${initialize._name}.${initialize._id}.${m}')`
    }), {} as Record<string, string>)

const defineComponent = (instance: { _name: string, _id: string, _key?: string | number | null }) => (_match: string, tag: string) => {
    let definition = `<${tag} facade="${instance._name}.${instance._id}"`

    if (instance._key) {
        definition += ` key="${instance._key}"`
    }

    return definition
}

function getValue(data: Record<string, any>, value: string) {
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
