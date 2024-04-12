import { get } from 'lodash-es'
import { getComponentInstance, getMethods } from './ComponentManager'

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

    async handleComponent(param: string, data: any, parent: any) {
        const [compName, ...rawProps] = param.replace('>', '').trim().split(' ')
        const props = rawProps.reduce((acc: Record<string, any>, item: string) => {
            const [key, value] = item.split('=')
            acc[key] = getValue(data, value)
            return acc
        }, {})

        const instance = await getComponentInstance(compName, props, parent)
        const methods = getMethods(instance)

        this.postComponent?.(instance, parent)

        let template = instance.render()
        template = template.replace(/<(\w+)/, (_match: string, tag: string) => `<${tag} facade="${instance._name}.${instance._id}"'`)

        const result = await this.render(template, {...instance, ...methods}, instance as any)

        return result.replace(/@(\w+)(:\w+)?="(.*?)"/g,
            (_: string, event: string, mode: string = ':lazy', method: string) =>
                `data-facade-event="${event}.${mode?.replace(':', '')}.${instance._name}.${instance._id}.${method}" id="${instance._name}.${instance._id}"`
        )
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
