import { JSXInternal } from 'preact/src/jsx'
import { rebuildInstance, getComponentNode, makeComponentNode } from './ComponentGraph'
import { isEqual, isString, isBoolean, isFunction, isObject, isArray } from 'lodash'
import { IComponentNode } from './Interfaces'
import { getComponentDeclaration, registerComponent } from './ComponentRegistry'
import { AComponent } from './Component'
import { parse } from 'node-html-parser'
import { getGraph, getRoots } from './ComponentGraph'
import { DiffDOM, stringToObj } from 'diff-dom'
import { callWithContext, callWithContextAsync } from './Context'

const isClinet = !(typeof process === 'object')
let scripts: string = ''
let dom: any | null = null

export function getScripts() { return scripts }
export function clearScripts() { scripts = '' }

export function getDOM() { return dom }
export function setDOM(pastDom: string) { dom = parse(pastDom) }
export function clearDOM() { dom = null }

export async function rerenderComponent(componentName: string, componentId: string) {
    const componentNode = getComponentNode(componentName, componentId)!
    const result = await renderComponent(componentNode, componentNode.xpath ?? '')
    const element = document.getElementById(`${componentName}.${componentId}`)!
    // const dd = new DiffDOM()
    // const diff = dd.diff(element, result)
    // dd.apply(element, diff)
    element.outerHTML = result
}

export async function rerenderModifiedComponents() {
    const [root] = getRoots()
    const graph = getGraph()
    const nodes: IComponentNode[] = []

    graph.traverseDfs(root, (_, node) => {
        if (node.needsRender && !node.haveRendered) {
            nodes.push(node)
        }
    })

    const nodePromises = nodes.map(async (node) => {
        node.instance ??= rebuildInstance(node).instance
        const result = await renderComponent(node, node.xpath ?? '')
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

export async function renderer(jsx: any, parent: IComponentNode | null = null, parentXPath: string = '', index: number | null = null) {
    if (shouldIgnore(jsx)) return ''
    if (isPrimitive(jsx))  return jsx as any

    if (isClass(jsx)) {
        return await renderClass(jsx, parent, parentXPath, index)
    }

    if (isFunction(jsx.type)) {
        return await renderFunction(jsx, parent, parentXPath, index)
    }

    return await renderHTML(jsx, parent, parentXPath, index)
}

async function renderHTML(jsx: JSXInternal.Element, parent: IComponentNode | null, parentXPath: string, index: number | null = null) {
    let result = `<${jsx.type}`

    if (jsx.key) {
        result += ` key="${jsx.key}"`
    }

    const { children, ...props } = jsx.props ?? { children: [], key: null }

    Object.keys(props)
        .forEach((key) => result += renderAttribute(key, props[key], parent))

    if (!hasChildren(jsx)) {
        result += ` ></${jsx.type}>`
    } else {
        result += '>'
        const xpath = `${parentXPath}/${jsx.type}`
        // if (index !== null) xpath += `[${index}]`
        result += await renderChildren(children, parent, xpath)
        result += `</${jsx.type}>`
    }

    return result
}

async function renderChildren(children: any, parent: IComponentNode | null, parentXPath: string) {
    if (isString(children)) {
        return children
    }

    if (Array.isArray(children)) {
        const promises = children.flat().map(async (child, index) => await renderer(child, parent, parentXPath, index))
        return (await Promise.all(promises)).join('')
    }

    if (typeof children === 'function') {
        return await renderer(children(), parent, parentXPath)
    }

    return await renderer(children, parent, parentXPath)
}

function renderAttribute(key: any, value: any, parent: IComponentNode | null) {
    if (isBoolean(value)) {
        if (value) {
            return ` ${key}`
        } else {
            return ''
        }
    }

    if (isFunction(value)) {
        let functionName = value.name
        const stringified = value.toString().replace(/\s/g, '')
        const isArrow = /(\w+=>)|(\((\w+(,\w+))?\))=>/.test(stringified)

        if (isArrow) {
            const parentNode = parent as IComponentNode
            const component = getComponentDeclaration(parentNode.name) as any
            component._anonymous[parentNode.name] ??= []
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

        return ` ${event}="facade.event(event, '${parent!.name}.${parent!.id}.${functionName}.${eventName}.${mode}', ${isClinet})"`
    }

    if (isObject(value)) {
        // Render style attribute
        if (key === 'style') {
            let style = '' as string
            for (const styleKey in value) {
                const styleValue = (value as any)[styleKey as any]
                // turn camelCase to kebab-case
                if (styleValue === null || styleValue === undefined) continue
                const actualStyleKey = styleKey.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()
                style += `${actualStyleKey}: ${styleValue};`
            }

            if (style !== '') {
                return ` style="${style}"`
            }
        }

        // Render attribute with an object value
        return ` ${key}="${JSON.stringify(value)}"`
    }

    if (key.includes(':bind')) {
        return ` oninput="facade.event(event, '${parent!.name}.${parent!.id}.${value.replace('this.', '')}.input.bind')"`
    }

    // Render attribute with a value
    return ` ${key}="${value}"`
}

async function renderClass(jsx: JSXInternal.Element, parent: IComponentNode | null, parentXPath: string, index: number | null = null) {
    if (parent) parent.hasChildren = true

    const declaration = jsx.type as any

    registerComponent(declaration.name, declaration)

    const { children, ...initProps } = jsx.props ?? { children: [], key: null }
    const props = { ...initProps, key: jsx.props?.key ?? null }

    const xpath = `${parentXPath}/${declaration.name}${props.key ? `[${props.key}]` : ''}`

    let componentNode = getComponentNode(declaration.name, xpath)

    if (!componentNode) {
        componentNode = await makeComponentNode(declaration.name, xpath, props, parent)
    }

    if (componentNode.needsRender) {
        componentNode.instance ??= rebuildInstance(componentNode).instance
        const instance = componentNode.instance as AComponent

        await callWithContextAsync(() => instance?.mounted(), componentNode.name, null, instance)

        if (!isEqual(componentNode.props, props)) {
            callWithContext(() => instance!.recived(props), componentNode.name, null, instance)
        }

        componentNode.haveRendered = true

        const result: string = await renderComponent(componentNode, xpath)
        const idToFind = `${componentNode.name}.${componentNode.id}`

        replaceElementById(idToFind, result)

        return result as string
    }

    const idToFind = `${componentNode.name}.${componentNode.id}`
    return getElementById(idToFind) as string
}

export async function renderComponent(componentNode: IComponentNode, xpath: string) {
    // const script = declaration?.client?.toString()
    // if (script) appendScripts(script, componentNode)

    const template = callWithContext(() => componentNode.instance!.render(), componentNode.name, null, componentNode.instance)
    const subResult = await renderer(template, componentNode, xpath) || '<div></div>'
    return subResult.replace(/<(\w+)/, defineComponent(componentNode.name, componentNode.id, componentNode.key))
}

export function replaceElementById(idToFind: string, replacement: string) {
    if (!dom) return
    const element = dom.getElementById(idToFind)
    if (element) {
        element.replaceWith(parse(replacement))
    }
}

export function getElementById(idToFind: string) {
    if (!dom) return
    return dom.getElementById(idToFind)
}

async function renderFunction(jsx: any, parent: IComponentNode | null = null, parentXPath: string = '', index: number | null = null): Promise<string> {
    if (isFragment(jsx)) {
        return await renderFragment(jsx, parent, parentXPath, index)
    }

    if (isFacade(jsx)) {
        return await renderFacade(jsx, parent, parentXPath, index)
    }

    if (parent) parent.hasChildren = true

    const functionResult = callWithContext(() => jsx.type(jsx.props), jsx.type.name)
    const xpath = `${parentXPath}/${jsx.type.name}`
    return await renderer(functionResult, parent, xpath, index)
}

async function renderFacade(jsx: any, parent: IComponentNode | null = null, parentXPath: string = '', index: number | null = null): Promise<string> {
    const { props } = jsx

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

    const functionResult = callWithContext(() => jsx.type(properties), jsx.type.name)
    const xpath = `${parentXPath}/${jsx.type.name}`
    return await renderer(functionResult, parent, xpath, index)
}

async function renderFragment(jsx: any, parent: IComponentNode | null = null, parentXPath: string = '', index: number | null = null): Promise<string> {
    const functionResult = jsx.type(jsx.props)
    let xpath = `${parentXPath}/fragment`

    if (isArray(functionResult)) {
        // if (index !== null) xpath += `[${index}]`
        const promises = functionResult.map(async (child, index) => await renderer(child, parent, xpath, index))
        return (await Promise.all(promises)).join('')
    }

    return await renderer(functionResult, parent, xpath)
}

const defineComponent = (name: string | null, id: string | null, key?: string | number | null) => (_match: string, tag: string) => {
    let definition = `<${tag} id="${name}.${id}"`

    if (key) {
        definition += ` key="${key}"`
    }

    return definition
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
    return (jsx === null || jsx === false || jsx === true || jsx === undefined)
}

function isHTML(jsx: any) {
    return isString(jsx.type)
}

function isClass(jsx: any) {
    return (
        isFunction(jsx.type) &&
        Object.getOwnPropertyDescriptor(jsx.type, 'prototype')?.writable === false
    )
}

function hasChildren(jsx: JSXInternal.Element) {
    const { children } = jsx.props ?? {}
    return (children && Array.isArray(children) && children.length > 0)
}

function isFragment(jsx: any) {
    return (isFunction(jsx.type) && jsx.type.name === 'Fragment')
}

function isFacade(jsx: any) {
    return (isFunction(jsx.type) && jsx.type.name === 'Facade')
}
