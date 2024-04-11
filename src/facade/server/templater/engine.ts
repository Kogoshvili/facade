import { get } from 'lodash-es'

let components: Record<string, any> = {}

export function registerComponents(comps: Record<string, any>) {
    components = comps
}

function getValue(data: any, value: string) {
    const valueIsParam = value.startsWith('{') && value.endsWith('}')

    if (valueIsParam) {
        // get value without {}
        value = value.slice(1, -1)

        // if value is 'this' return data
        if (value === 'self') {
            return data
        }

        // if value has ' or " return value
        if (value.startsWith('"') || value.startsWith('\'')) {
            return value.slice(1, -1)
        }

        // if value is number, convert it to number
        if (!isNaN(value as any)) {
            return Number(value)
        }

        // if value has . or [ get value from data
        if (value.includes('.') || value.includes('[')) {
            return get(data, value)
        }
    }

    return data[value]
}

const skipOffsets: number[][] = []


const replacer = (data: any, parent: any) => async (_: any, match: string, offset: number, content: string): Promise<string> => {
    const param = match.trim()

    if (param.startsWith('/')) {
        return ''
    }

    if (skipOffsets.some(([start, end]) => offset > start && offset < end)) {
        return ''
    }

    if (param === 'self') {
        return JSON.stringify(data)
    }

    if (param.startsWith('#')) {
        const [helper, ...rawParams] = param.replace('#', '').trim().split(' ')
        const params = rawParams.map((param: any) => getValue(data, param)).flat()
        if (helper === 'each') {
            const endEachBlock = content.indexOf('{{/each}}', offset)
            const eachBlock = content.slice(offset, endEachBlock + 9)
            const eachTemplate = eachBlock.replace(`{{#each ${rawParams[0]}}}`, '').trim()
            const result = await Promise.all(params.map(async (p: any) => await render(eachTemplate, p, { name: 'each' })))
            skipOffsets.push([offset, endEachBlock + 9])
            return result.join('')
        }
    }

    if (param.startsWith('>')) {
        const [compName, ...rawProps] = param.replace('>', '').trim().split(' ')
        const props = rawProps.reduce((acc: Record<string, any>, item: string) => {
            const [key, value] = item.split('=')
            acc[key] = getValue(data, value)
            return acc
        }, {})

        const comp1 = components[compName]
        const comp = new comp1(props, parent)
        await comp.mount?.()
        return await render(comp.render(), {...comp}, { name: compName })
    }

    if (param.includes('.') || param.includes('[')) {
        return get(data, param)
    }

    return data[param]
}

async function render(template: string, data: Record<string, any>, parent = {}) {
    const regex = RegExp(/{{\s*([\s\S]+?)\s*}}/g)
    let context = template
    let match // ["{{> ProductList }}", "> ProductList"] groups, index, input

    while ((match = regex.exec(context)) !== null) {
        const a = replacer(data, parent)
        const replace = await a(null, match[1], match.index, context)
        const start = match.index
        const end = start + match[0].length
        context = context.slice(0, start) + replace + context.slice(end)
    }

    return context
}


export default render
