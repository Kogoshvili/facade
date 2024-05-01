import { JSXInternal } from 'preact/src/jsx'
import { rebuildInstance, getComponentNode, makeComponentNode } from './ComponentGraph'
import { isEqual } from 'lodash'
import { IComponentNode } from './Interfaces'
import { getComponentDeclaration, registerComponent } from './ComponentRegistry'
import { AComponent } from './Component'
import { parse } from 'node-html-parser'
import { getGraph, getRoots } from './ComponentGraph'
import { DiffDOM, stringToObj } from 'diff-dom'
import { callWithContext, callWithContextAsync } from './Context'

let scripts: string = ''
let dom: any | null = null

export function getScripts() { return scripts }
export function clearScripts() { scripts = '' }

export function getDOM() { return dom }
export function setDOM(pastDom: string) { dom = parse(pastDom) }
export function clearDOM() { dom = null }

export async function rerenderModifiedComponents() {
    const [root] = getRoots()
    const graph = getGraph()
    const nodes: IComponentNode[] = []

    graph.traverseDfs(root, async (_, node) => {
        if (node.needsRender && !node.haveRendered) {
            nodes.push(node)
        }
    })

    const nodePromises = nodes.map(async (node) => {
        const declaration = getComponentDeclaration(node.name)
        node.instance = node.instance ?? rebuildInstance(node).instance
        const result = await renderComponent(declaration, node, node.xpath ?? '')
        const idToFind = `${node.name}.${node.id}`
        const oldElement = getElementById(idToFind).outerHTML

        const dd = new DiffDOM()
        const prevBody = stringToObj(oldElement)
        const newBody = stringToObj(result!)
        const domDiff = dd.diff(prevBody, newBody)

        replaceElementById(idToFind, result)

        return {
            id: node.id,
            name: node.name,
            diff: domDiff
        }
    })

    return await Promise.all(nodePromises)
}

export async function renderer(jsx: JSXInternal.Element | null, parent: IComponentNode | null = null, parentXPath: string = '', index: number | null = null): Promise<string> {
    if (shouldIgnore(jsx)) return ''
    if (isPrimitive(jsx))  return jsx as any

    jsx = jsx as JSXInternal.Element

    if (jsx.type === undefined) return ''

    // Normal HTML element
    if (typeof jsx.type === 'string') {
        return await renderNormalHTML(jsx.type, jsx, parent, parentXPath, index)
    }

    // Custom component
    if (isClass(jsx.type)) {
        return await renderComponentClass(jsx.type, jsx, parent, parentXPath)
    }

    const isFragment = jsx.type.name === 'Fragment'

    if (isFragment) {
        return await renderFragment(jsx.type, jsx.props, parent, parentXPath, index)
    }

    return await renderFunction(jsx.type, jsx.props, parent, parentXPath, index)
}

async function renderFragment(fn: any, props: any, parent: IComponentNode | null = null, parentXPath: string = '', index: number | null = null): Promise<string> {
    const functionResult = fn(props)

    let xpath = `${parentXPath}/fragment`

    if (Array.isArray(functionResult)) {
        if (index !== null) xpath += `[${index}]`
        const promises = functionResult.map(async (child, index) => await renderer(child, parent, xpath, index))
        return (await Promise.all(promises)).join('')
    } else {
        return await renderer(functionResult, parent, xpath)
    }
}

async function renderFunction(fn: any, props: any, parent: IComponentNode | null = null, parentXPath: string = '', index: number | null = null): Promise<string> {
    const functionName = fn.name
    const isFacade = fn.name === 'Facade'

    // for (const key in props) {
    //     if (typeof props[key] === 'function') {
    //         const functionName = props[key].name
    //         properties[key] = `facade.event(event, '${parent!.name}.${parent!.id}.${functionName}.${key}.${mode}')`

    //     } else {
    //         properties[key] = props[key]
    //     }
    // }


    if (!isFacade && parent) parent.hasChildren = true

    if (isFacade) {
        const properties: any = {
            xpath: `${parentXPath}-facade`
        }

        const keys = Object.keys(props)
        keys.forEach((key) => {
            properties[key] = props[key]

            if (typeof props[key] === 'function') {
                let functionName = props[key].name
                const stringified = props[key].toString().replace(/\s/g, '')

                const isArrow = /(\w+=>)|(\((\w+(,\w+))?\))=>/.test(stringified)

                if (isArrow) {
                    const parentNode = parent as IComponentNode
                    const component = getComponentDeclaration(parentNode.name) as any
                    component._anonymous[parentNode.name] = component._anonymous[parentNode.name] || []
                    const anonymousMethods = component._anonymous[parentNode.name]
                    const index = anonymousMethods.findIndex((i: string) => i === stringified)

                    if (index === -1) {
                        const length = anonymousMethods.push(stringified)
                        functionName = `${length! - 1}`
                    } else {
                        functionName = `${index}`
                    }
                }

                // Event handler
                const [event, mode = 'default'] = key.split(':')
                const eventName = event.startsWith('on') ? event.toLowerCase().slice(2) : event

                properties[key] = `facade.event(event, '${parent!.name}.${parent!.id}.${functionName}.${eventName}.${mode}')`
            }
        })

        let functionResult = ''
        callWithContext(fn.name, () => functionResult = fn(properties))
        const xpath = `${parentXPath}/${functionName}`

        return await renderer(functionResult, parent, xpath, index)
    }

    let functionResult = ''
    callWithContext(fn.name, () => functionResult = fn(props))
    const xpath = `${parentXPath}/${functionName}`

    return await renderer(functionResult, parent, xpath, index)
}

async function renderComponentClass(elementType: any, jsx: JSXInternal.Element, parent: IComponentNode | null, parentXPath: string) {
    if (parent) parent.hasChildren = true

    const declaration = (elementType as any)
    registerComponent(elementType.name, elementType)
    const props = { ...jsx.props, key: jsx.key ?? null }
    const xpath = `${parentXPath}/${elementType.name}${props.key ? `[${props.key}]` : ''}`
    let componentNode = getComponentNode(elementType.name, xpath)
    let instance: AComponent | null = null
    let result = ''

    if (!componentNode || componentNode.needsRender) {
        if (!componentNode) {
            componentNode = await makeComponentNode(elementType.name, xpath, props, parent)
            instance = componentNode.instance
        }

        instance = componentNode.instance ?? rebuildInstance(componentNode).instance

        await callWithContextAsync(componentNode.name, () => instance?.mounted())

        if (!isEqual(componentNode.props, props)) {
            callWithContext(componentNode.name, () => instance!.recived(props))
        }

        componentNode.haveRendered = true

        result = await renderComponent(declaration, componentNode, xpath)
        const idToFind = `${componentNode.name}.${componentNode.id}`

        if (dom) replaceElementById(idToFind, result)

        return result
    }

    componentNode.haveRendered = true

    const idToFind = `${componentNode.name}.${componentNode.id}`

    return getElementById(idToFind)
}

export function replaceElementById(idToFind: string, replacement: string) {
    const element = dom!.getElementById(idToFind)
    if (!element) return
    element.replaceWith(parse(replacement))
}

export function getElementById(idToFind: string) {
    return dom!.getElementById(idToFind)
}

async function renderNormalHTML(elementType: string, jsx: JSXInternal.Element, parent: IComponentNode | null, parentXPath: string, index: number | null) {
    let result = `<${elementType}`

    if (jsx.key) {
        result += ` key="${jsx.key}"`
    }

    const { children, ...props } = jsx.props

    // if keys have bind and onInput or oninput remove onInput
    const keys = Object.keys(props)
    keys.forEach((key) => result += renderAttributes(key, props, parent))

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
                const promises = children.flat().map(async (child, index) => await renderer(child, parent, xpath))
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

function renderAttributes(key: any, props: any, parent: IComponentNode | null) {
    let result = '' as string
    // Render element attributes
    const value = props[key]

    if (typeof value === 'boolean') {
        // Render boolean attribute without a value if it is true
        if (value) {
            result += ` ${key}`
        }
    } else if (typeof value === 'function') {
        let functionName = value.name
        const stringified = value.toString().replace(/\s/g, '')

        const isArrow = /(\w+=>)|(\((\w+(,\w+))?\))=>/.test(stringified)

        if (isArrow) {
            const parentNode = parent as IComponentNode
            const component = getComponentDeclaration(parentNode.name) as any
            component._anonymous[parentNode.name] = component._anonymous[parentNode.name] || []
            const anonymousMethods = component._anonymous[parentNode.name]
            const index = anonymousMethods.findIndex((i: string) => i === stringified)

            if (index === -1) {
                const length = anonymousMethods.push(stringified)
                functionName = `${length! - 1}`
            } else {
                functionName = `${index}`
            }
        }

        // Event handler
        const [event, mode = 'default'] = key.split(':')
        const eventName = event.startsWith('on') ? event.toLowerCase().slice(2) : event

        result += ` ${event}="facade.event(event, '${parent!.name}.${parent!.id}.${functionName}.${eventName}.${mode}')"`
    } else if (typeof value === 'object' && value !== null) {
        // Render style attribute
        if (key === 'style') {
            let style = '' as string
            for (const styleKey in value) {
                // turn camelCase to kebab-case
                if (value[styleKey] === null || value[styleKey] === undefined) continue
                const actualStyleKey = styleKey.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()
                style += `${actualStyleKey}: ${value[styleKey]};`
            }

            if (style !== '') {
                result += ` style="${style}"`
            }
        } else {
            // Render attribute with an object value
            result += ` ${key}="${JSON.stringify(value)}"`
        }
    } else {
        if (key.includes(':bind')) {
            result += ` oninput="facade.event(event, '${parent!.name}.${parent!.id}.${value.replace('this.', '')}.input.bind')"`
        } else {
            // Render attribute with a value
            result += ` ${key}="${value}"`
        }
    }

    return result
}

export async function renderComponent(declaration: any, componentNode: IComponentNode, xpath: string) {
    const script = declaration?.client?.toString()
    if (script) appendScripts(script, componentNode)

    const template = componentNode.instance.render()
    const subResult = await renderer(template, componentNode, xpath) || '<div></div>'
    return subResult.replace(/<(\w+)/, defineComponent(componentNode.name, componentNode.id, componentNode.key))
}

function appendScripts(script: string, componentNode: IComponentNode) {
    const code = script.slice(15, -1)
    const wrapperd = `
        <script type="text/javascript">
            addEventListener('facade:state:updated', ({
                detail: { updatedProperties }
            }) => {
                const component = facade.state.find(
                    s => s.key === '${componentNode.name}/${componentNode.id}'
                ).value

                const methods = component.methods.reduce((acc, method) => {
                    acc[method] = async function() {
                        return await facade.request(
                            '${componentNode.name}',
                            '${componentNode.id}',
                            method,
                            arguments
                        )
                    }
                    return acc
                }, {})

                const thisMock = {
                    ...component.properties,
                    ...methods
                }

                if (updatedProperties === null || updatedProperties.some(i => i.componentName === '${componentNode.name}' && i.componentId === '${componentNode.id}'))
                {
                    (async function client_${componentNode.name}() {
                            ${code}
                    }).call(thisMock)
                }
            })
        </script>
    `
    scripts += wrapperd
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
    let definition = `<${tag} id="${name}.${id}"`

    if (key) {
        definition += ` key="${key}"`
    }

    return definition
}
