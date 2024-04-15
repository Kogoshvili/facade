import { JSXInternal } from 'preact/src/jsx'
import { getBuiltComponentNode } from './ComponentManager'
import { IComponentNode } from './Interfaces'
import { components } from './index'

export async function renderer(jsx: JSXInternal.Element | null, parent: IComponentNode | null = null): Promise<string> {
    // @ts-ignore
    if (jsx === null || jsx === false || jsx === undefined) {
        return ''
    }

    if (typeof jsx === 'string') {
        return jsx
    }

    const elementType = jsx.type

    // Normal HTML element
    if (typeof elementType === 'string') {
        let result = `<${elementType}`

        if (jsx.key) {
            result += ` key="${jsx.key}"`
        }

        const { children, ...props } = jsx.props

        // Render element attributes
        for (const key in props) {
            if (props.hasOwnProperty(key)) {
                const value = props[key]

                if (typeof value === 'boolean') {
                    // Render boolean attribute without a value if it is true
                    if (value) {
                        result += ` ${key}`
                    }
                } else if (typeof value === 'function') {
                    let functionName = value.name
                    const stringified = value.toString()

                    const isArrow = /(\w+=>)|(\((\w+(,\w+))?\))=>/.test(stringified)

                    if (isArrow) {
                        const component = components[parent!.name]
                        component._anonymous[parent!.name] = component._anonymous[parent!.name] || []
                        const anonymousMethods = component._anonymous[parent!.name]
                        const index = anonymousMethods.findIndex((i: string) => i === stringified)

                        if (index === -1) {
                            const length = anonymousMethods.push(stringified)
                            functionName = `${length!-1}`
                        } else {
                            functionName = `${index}`
                        }
                    }

                    // Event handler
                    const [event, mode] = key.split(':')
                    const eventName = event.startsWith('on') ? event.toLowerCase().slice(2) : event

                    result += ` ${event}="facade.event(event, '${parent!.name}.${parent!.id}.${functionName}', '${eventName}', '${mode || 'lazy'}')"`
                } else {
                    // Render attribute with a value
                    result += ` ${key}="${value}"`
                }
            }
        }

        // Check if the element is self-closing
        const isSelfClosing = !children || (Array.isArray(children) && children.length === 0)

        if (isSelfClosing) {
            result += ` ></${elementType}>`
        } else {
            result += '>'

            if (children) {
                if (typeof children === 'string') {
                    result += children
                } else if (Array.isArray(children)) {
                    const promises = children.map(async (child) => await renderer(child, parent))
                    result += (await Promise.all(promises)).join('')
                } else if (typeof children === 'function') {
                    result += await renderer(children(), parent)
                } else {
                    result += await renderer(children, parent)
                }
            }

            result += `</${elementType}>`
        }

        return result
    }

    if (isClass(elementType)) {
        // Custom component
        const props = jsx.props || {}
        props.key = jsx.key
        // @ts-ignore
        const componentNode = await getBuiltComponentNode(elementType.name, props, parent)

        if (!componentNode) {
            return ''
        }

        componentNode.haveRendered = true

        const component = components[componentNode.name]

        if (componentNode.instance === null) {
            if (componentNode.hasChildren) {
                // const methodsMap = buildMethodMap({_name: componentNode.name, _id: componentNode.id})(componentNode.methods)
                componentNode.prevRender = await renderer(
                    component!.render.call({...componentNode.props, ...componentNode.properties, ...componentNode.methods}),
                    // {...componentNode.properties, ...methodsMap},
                    componentNode
                )
            }

            return componentNode.prevRender ?? ''
        }

        const instance = componentNode.instance

        // const methodsMap = buildMethodMap(instance)(getMethods(instance))
        const template = component!.render.call(instance)

        let subResult = await renderer(template, componentNode)

        subResult = subResult.replace(/<(\w+)/, defineComponent(instance))

        componentNode.prevRender = subResult

        return subResult
    }

    // @ts-ignore
    const fragmentResult = elementType(jsx.props)

    if (Array.isArray(fragmentResult)) {
        const promises = fragmentResult.map(async (child) => await renderer(child, parent))
        return (await Promise.all(promises)).join('')
    } else {
        return await renderer(fragmentResult, parent)
    }
}

function isClass(fn: any) {
    return (
        typeof fn === 'function' &&
        Object.getOwnPropertyDescriptor(fn, 'prototype')?.writable === false
    )
}

const defineComponent = (instance: { _name: string, _id: string, _key?: string | number | null }) => (_match: string, tag: string) => {
    let definition = `<${tag} facade="${instance._name}.${instance._id}"`

    if (instance._key) {
        definition += ` key="${instance._key}"`
    }

    return definition
}
