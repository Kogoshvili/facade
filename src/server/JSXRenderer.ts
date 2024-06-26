import { isString, isBoolean, isFunction, isObject, isArray } from 'lodash-es'
import { DiffDOM, stringToObj } from 'diff-dom'
import { deepEqual } from 'fast-equals';
import { rebuildInstance, getComponentNode, makeComponentNode, getComponentsToRerender, populateProps } from './ComponentGraph'
import { IComponentNode, JSXObject } from './Interfaces'
import { getComponentDeclaration, registerAnonymousMethod, registerComponent } from './ComponentRegistry'
import { getGraph, getRoots } from './ComponentGraph'
import { callWithContext, callWithContextAsync } from './Context'
import Facade from '../components/Facade'
import { appendScripts, appendStyles, getDOM, getElementById, replaceElementById } from './Dom';
import { getRequestType } from './Server';

const isClinet = !(typeof process === 'object')

export async function rerenderComponent(componentName: string, componentId: string) {
    const componentNode = getComponentNode(componentName, componentId)!
    const declaration = getComponentDeclaration(componentName)
    const result = await renderComponent(componentNode, componentNode.xpath ?? '', declaration)
    const element = document.getElementById(`${componentName}.${componentId}`)!
    const dd = new DiffDOM({ valueDiffing: false }) as any //
    const diff = dd.diff(element, result)
    // console.log('Diff', diff, nodeToObj(element), stringToObj(result))
    // const clearDiff = cleanDiff(diff as any)
    dd.apply(element, diff)
    // element.outerHTML = result
}

export async function rerenderModifiedComponents() {
    const graph = getGraph()
    const results: any[] = []
    const roots = getRoots()
    const renderedComponents = getComponentsToRerender()//

    // const renderOrder = [...renderedComponents].sort((a, b) => {
    //     if (roots.has(a)) return 1
    //     if (roots.has(b)) return -1
    //     return 0
    // })

    for (const componentId of renderedComponents) {
        const node = graph.getVertexValue(componentId)!
        if (!node.needsRender) continue

        const declaration = getComponentDeclaration(node.name)
        node.instance ??= rebuildInstance(node).instance
        const result = await renderComponent(node, node.xpath ?? '', declaration)
        node.haveRendered = true

        let newBody = stringToObj(result!)
        // let isPage = false

        // if (newBody.nodeName === 'HTML') {
        //     isPage = true
        //     newBody = newBody.childNodes[1]
        // }
        //
        const prevElement = getElementById(`${node.name}.${node.id}`);

        if (!prevElement) {
            node.needsRender = false
            continue
        }

        const prevBody = stringToObj(prevElement.outerHTML)


        const dd = new DiffDOM()
        const domDiff = dd.diff(prevBody, newBody)

        replaceElementById(`${node.name}.${node.id}`, result)
        results.push({
            id: node.id,
            name: node.name,
            diff: domDiff
        });
    }

    return results.filter(i => i.diff.length > 0)
}

export async function renderer(jsx: JSXObject, parent: IComponentNode | null = null, parentXPath: string = '', index: number | null = null) {
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

async function renderHTML(jsx: JSXObject, parent: IComponentNode | null, parentXPath: string, index: number | null = null) {
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
        const isArrow = /(\w+=>)|(\((\w+(,\w+))?\))=>/.test(stringified.split('{')[0])

        if (isArrow) {
            const parentNode = parent as IComponentNode
            const index = registerAnonymousMethod(parentNode!.name, stringified)
            functionName = `${index}`
        }

        // Event handler
        const [event, mode = 'default'] = key.split(':')
        const eventName = event.startsWith('on') ? event.toLowerCase().slice(2) : event

        return ` ${event.toLowerCase()}="facade.event(event, '${parent!.name}.${parent!.id}.${functionName}.${eventName}.${mode}', ${isClinet})"`
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

    const attribute = key.toLowerCase()

    if (attribute === 'classname') {
        return ` class="${value}"`
    }

    if (attribute === 'htmlfor') {
        return ` for="${value}"`
    }

    // Render attribute with a value
    return ` ${attribute}="${value}"`
}

async function renderClass(jsx: JSXObject, parent: IComponentNode | null, parentXPath: string, index: number | null = null) {
    if (parent) parent.hasChildren = true

    const declaration = jsx.type as any

    registerComponent(declaration.name, declaration)

    const { children, ...initProps } = jsx.props ?? { children: [], key: null }
    const props = { ...initProps, key: jsx.props?.key ?? null }

    const xpath = `${parentXPath}/${declaration.name}${props.key ? `[${props.key}]` : ''}`

    let componentNode = getComponentNode(declaration.name, xpath)

    if (!componentNode) {
        componentNode = await makeComponentNode(declaration.name, xpath, props, parent)
    } else {
        const requestType = getRequestType()
        if (requestType === 'page') {
            componentNode = await makeComponentNode(declaration.name, xpath, props, parent, componentNode.id)
        }
    }

    const idToFind = `${componentNode.name}.${componentNode.id}`
    const prevRender = isClinet ? true : getElementById(idToFind)

    let propsChanged = false
    if (componentNode.needsRender || !prevRender || (propsChanged = !deepEqual(componentNode.props, props))) {
        if (!componentNode.instance) {
            componentNode.instance = rebuildInstance(componentNode).instance
            const instance = componentNode.instance
            const context = { name: componentNode.name, id: componentNode.id, declaration, instance }
            callWithContext(() => populateProps(instance, props), context)
            // callWithContext(() => instance?.callExpressions?.(), context)
            await callWithContextAsync(() => instance!.mounted(), context)
        }

        componentNode.haveRendered = true

        const result: string = await renderComponent(componentNode, xpath, declaration)

        if (!isClinet) {
            replaceElementById(idToFind, result)

            if (!prevRender) {
                const script = await componentNode.instance!.script?.() as any
                if (script) appendScripts(script, componentNode)

                // const style = componentNode.instance?.style?.()
                // if (style) appendStyles(style)
            }
        }

        return result
    }

    componentNode.haveRendered = true

    return prevRender
}

export async function renderComponent(componentNode: IComponentNode, xpath: string, declaration: any): Promise<string> {
    const template = callWithContext(() => componentNode.instance!.render(), { name: componentNode.name, id: componentNode.id, declaration, instance: componentNode.instance })
    const subResult = await renderer(template, componentNode, xpath) || '<div></div>'
    return subResult.replace(/<(\w+)/, defineComponent(componentNode.name, componentNode.id, componentNode.key))
}

async function renderFunction(jsx: JSXObject, parent: IComponentNode | null = null, parentXPath: string = '', index: number | null = null): Promise<string> {
    if (isFragment(jsx)) {
        return await renderFragment(jsx, parent, parentXPath, index)
    }

    if (!isClinet && isFacade(jsx)) {
        return await renderFacade(jsx, parent, parentXPath, index)
    }

    if (parent) parent.hasChildren = true

    const functionResult = callWithContext(() => jsx.type(jsx.props), jsx.type.name) as any
    const xpath = `${parentXPath}/${jsx.type.name}`
    return await renderer(functionResult, parent, xpath, index)
}

async function renderFacade(jsx: JSXObject, parent: IComponentNode | null = null, parentXPath: string = '', index: number | null = null): Promise<string> {
    const { props } = jsx

    const properties: any = {
        xpath: `${parentXPath}-facade`
    }

    const keys = Object.keys(props)
    keys.forEach((key) => {
        const attributeName = key.toLowerCase()
        properties[attributeName] = props[key]

        if (typeof props[key] === 'function') {
            let functionName = props[key].name
            const stringified = props[key].toString().replace(/\s/g, '')

            const isArrow = /(\w+=>)|(\((\w+(,\w+))?\))=>/.test(stringified)

            if (isArrow) {
                const parentNode = parent as IComponentNode
                const index = registerAnonymousMethod(parentNode!.name, stringified)
                functionName = `${index}`
            }

            // Event handler
            const [event, mode = 'default'] = key.split(':')
            const eventName = event.startsWith('on') ? event.toLowerCase().slice(2) : event
            properties[attributeName] = `${parent!.name}.${parent!.id}.${functionName}.${eventName}.${mode}`
        }
    })

    const functionResult = callWithContext(() => jsx.type(properties), jsx.type.name) as any
    const xpath = `${parentXPath}/${jsx.type.name}`
    return await renderer(functionResult, parent, xpath, index)
}

async function renderFragment(jsx: JSXObject, parent: IComponentNode | null = null, parentXPath: string = '', index: number | null = null): Promise<string> {
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

function isPrimitive(jsx: JSXObject) {
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

function isHTML(jsx: JSXObject) {
    return isString(jsx.type)
}

function isClass(jsx: JSXObject) {
    return (
        isFunction(jsx.type) &&
        Object.getOwnPropertyDescriptor(jsx.type, 'prototype')?.writable === false
    )
}

function hasChildren(jsx: JSXObject) {
    const { children } = jsx.props ?? {}
    return (children && Array.isArray(children) && children.length > 0)
}

function isFragment(jsx: JSXObject) {
    return (isFunction(jsx.type) && jsx.type.name === globalThis.fFragment.name)
}

function isFacade(jsx: JSXObject) {
    return (isFunction(jsx.type) && jsx.type.name === Facade.name)
}

/*
[
    {
        "action": "removeAttribute",
        "route": [],
        "name": "oninput",
        "value": "facade.event(event, 'Search.6E6jeAfmkL.handleInput.input.defer', true)"
    },
    {
        "action": "modifyAttribute",
        "route": [],
        "name": "value",
        "oldValue": "323",
        "newValue": "3"
    },
    {
        "action": "addAttribute",
        "route": [],
        "name": "onInput",
        "value": "facade.event(event, 'Search.6E6jeAfmkL.handleInput.input.defer', true)"
    },
    {
        "action": "modifyValue",
        "oldValue": "3",
        "newValue": "",
        "route": []
    }
]
*/

function cleanDiff(diff: {action: string, name?: string, value?: string, newValue?: string, oldValue?: string}[]) {
    const result = diff.filter((item, index, self) => {
        if (item.action === 'removeAttribute' || item.action === 'addAttribute') {
            const counterpartIndex = self.findIndex(i =>
                (i.action === 'removeAttribute' || i.action === 'addAttribute') &&
                i.action !== item.action &&
                i.name === item.name &&
                i.value === item.value
            );
            if (counterpartIndex !== -1) {
                self[counterpartIndex] = {action: ''}; // mark for removal
                return false;
            }
        } else if (item.action === 'modifyValue') {
            const modifyAttributeIndex = self.findIndex(i =>
                i.action === 'modifyAttribute' &&
                i.name === 'value'
            );
            if (modifyAttributeIndex !== -1) {
                return false;
            }
        }
        return true;
    });

    return result;
}

