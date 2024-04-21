import { JSXInternal } from 'preact/src/jsx'
import { rebuildInstance, getComponent, getComponentNode, makeComponentNode } from './ComponentGraph'
import { isEqual } from 'lodash'
import { IComponentNode } from './Interfaces'

export async function renderer(jsx: JSXInternal.Element | null, parent: IComponentNode | null = null, parentXPath: string = '', index: number | null = null): Promise<string> {
    // @ts-ignore
    if (shouldIgnore(jsx)) {
        return ''
    }

    if (isPrimitive(jsx)) {
        return jsx as any
    }

    jsx = jsx as JSXInternal.Element

    if (jsx.type === undefined) {
        return ''
    }

    const elementType = jsx.type

    // Normal HTML element
    if (typeof elementType === 'string') {
        let result = `<${elementType}`

        if (jsx.key) {
            result += ` key="${jsx.key}"`
        }

        const { children, ...props } = jsx.props

        // if keys have bind and onInput or oninput remove onInput
        const keys = Object.keys(props)

        keys.forEach((key) => {
            // Render element attributes
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
                    const parentNode = parent as IComponentNode
                    const component = getComponent(parentNode.name)!.declaration as any
                    component._anonymous[parentNode.name] = component._anonymous[parentNode.name] || []
                    const anonymousMethods = component._anonymous[parentNode.name]
                    const index = anonymousMethods.findIndex((i: string) => i === stringified)

                    if (index === -1) {
                        const length = anonymousMethods.push(stringified)
                        functionName = `${length!-1}`
                    } else {
                        functionName = `${index}`
                    }
                }

                // Event handler
                const [event, mode = 'lazy'] = key.split(':')
                const eventName = event.startsWith('on') ? event.toLowerCase().slice(2) : event

                result += ` ${event}="facade.event(event, '${parent!.name}.${parent!.id}.${functionName}.${eventName}.${mode}')"`
            } else {
                if (key.includes(':bind')) {
                    result += ` oninput="facade.event(event, '${parent!.name}.${parent!.id}.${value.replace('this.', '')}.input.bind')"`
                } else {
                    // Render attribute with a value
                    result += ` ${key}="${value}"`
                }
            }
        })

        // Check if the element is self-closing
        const isSelfClosing = !children || (Array.isArray(children) && children.length === 0)

        if (isSelfClosing) {
            result += ` ></${elementType}>`
        } else {
            result += '>'

            if (children) {
                let xpath = `${parentXPath}/${elementType}`
                if (index !== null) xpath += `[${index}]`

                if (typeof children === 'string') {
                    result += children
                } else if (Array.isArray(children)) {
                    const promises = children.map(async (child, index) => await renderer(child, parent, xpath, index))
                    result += (await Promise.all(promises)).join('')
                } else if (typeof children === 'function') {
                    result += await renderer(children(), parent, xpath)
                } else {
                    result += await renderer(children, parent, xpath)
                }
            }

            result += `</${elementType}>`
        }

        return result
    }

    // Custom component
    if (isClass(elementType)) {
        const props = { ...jsx.props, key: jsx.key ?? null }
        let componentNode = getComponentNode(elementType.name, parentXPath)
        let instance

        if (componentNode) {
            instance = componentNode.instance ?? rebuildInstance(componentNode).instance

            if (!isEqual(componentNode.props, props)) {
                instance!.recived(props)
            }
        } else {
            componentNode = await makeComponentNode(elementType.name, parentXPath, props, parent)
            instance = componentNode.instance
        }

        componentNode.haveRendered = true
        const template = (elementType as any).render.call(instance!)
        const xpath = `${parentXPath}/${elementType.name}`
        let subResult = await renderer(template, componentNode, xpath)
        subResult = subResult.replace(/<(\w+)/, defineComponent(componentNode.name, componentNode.id, componentNode.key))
        componentNode.prevRender = subResult

        return subResult
    }

    // @ts-ignore
    const functionName = elementType.name
    const functionResult = (elementType as any)(jsx.props)

    let xpath = `${parentXPath}/${functionName ?? 'fragment'}`

    if (Array.isArray(functionResult)) {
        if (index !== null) xpath += `[${index}]`

        const promises = functionResult.map(async (child, index) => await renderer(child, parent, xpath, index))
        return (await Promise.all(promises)).join('')
    } else {
        return await renderer(functionResult, parent, xpath)
    }
}

function isPrimitive(jsx: any) {
    return (
        typeof jsx === 'string' ||
        typeof jsx === 'number' ||
        typeof jsx === 'boolean' ||
        typeof jsx === 'bigint' ||
        typeof jsx === 'symbol'
    )
}

function shouldIgnore(jsx: any) {
    return (jsx === null || jsx === false || jsx === undefined)
}

function isClass(fn: any) {
    return (
        typeof fn === 'function' &&
        Object.getOwnPropertyDescriptor(fn, 'prototype')?.writable === false
    )
}

const defineComponent = (name: string | null, id: string | null, key?: string | number | null) => (_match: string, tag: string) => {
    let definition = `<${tag} facade="${name}.${id}"`

    if (key) {
        definition += ` key="${key}"`
    }

    return definition
}
