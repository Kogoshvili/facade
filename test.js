import { get } from 'lodash-es'

async function getProduct() {
    const result = (await fetch('https://fakestoreapi.com/products/1')).json()
    return result
}

function getChildComponent(props) {
    return {
        state: {
            person: {},
            ...props
        },
        async mount() {
            this.state.product = await getProduct()
        },
        render() {
            return `
                <div>
                    <h1>Hello, {{ person.name }}</h1>
                </div>
            `
        }
    }
}

function getParentComponent(props) {
    return {
        state: {
            name: 'Parent',
            value: 100,
            people: [
                { name: 'John' },
                { name: 'Jane' },
                { name: 'Doe' }
            ]
        },
        render() {
            return `
                <div>
                    <h1>Hello, {{ name }}</h1>
                    <ul>
                        {{#each people}}
                            {{> ChildComponent person={self} }}
                        {{/each}}
                    </ul>
                </div>
            `
        }
    }
}

const components = {
    ChildComponent: getChildComponent
}

function getValue(data, value) {
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
        if (!isNaN(value)) {
            return Number(value)
        }

        // if value has . or [ get value from data
        if (value.includes('.') || value.includes('[')) {
            return get(data, value)
        }
    }

    return data[value]
}

const skipOffsets = []

function render(template, data, parent = {}) {
    return template.replace(/{{\s*([\s\S]+?)\s*}}/g, (_, match, offset, content) => {
        const param = match.trim()

        if (param.startsWith('/')) {
            return ''
        }

        if (skipOffsets.some(([start, end]) => offset > start && offset < end)) {
            return ''
        }

        if (param === 'this') {
            return data
        }

        if (param.startsWith('#')) {
            const [helper, ...rawParams] = param.replace('#', '').trim().split(' ')
            const params = rawParams.map(param => getValue(data, param)).flat()
            if (helper === 'each') {
                const endEachBlock = content.indexOf('{{/each}}', offset)
                const eachBlock = content.slice(offset, endEachBlock + 9)
                const eachTemplate = eachBlock.replace(`{{#each ${rawParams[0]}}}`, '').trim()
                const result = params.map(p => render(eachTemplate, p, { name: 'each' }))
                skipOffsets.push([offset, endEachBlock + 9])
                return result.join('')
            }
        }

        if (param.startsWith('>')) {
            const [compName, ...rawProps] = param.replace('>', '').trim().split(' ')
            const props = rawProps.reduce((acc, item) => {
                const [key, value] = item.split('=')
                acc[key] = getValue(data, value)
                return acc
            }, {})

            const comp = components[compName](props, parent)
            return render(comp.render(), comp.state, { name: compName })
        }

        if (param.includes('.') || param.includes('[')) {
            return get(data, param)
        }

        return data[param]
    })
}



const comp = getParentComponent({})

const result = render(comp.render(), comp.state)

console.log(result)
