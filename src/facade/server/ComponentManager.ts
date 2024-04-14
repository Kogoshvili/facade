import fp from 'lodash/fp'
import { components } from './index'
import build from './Factory'
import { isEqual } from 'lodash'
import { nanoid } from 'nanoid'
import { IComponentNode, IComponentNodeJSON } from './Interfaces'

export let ComponentGraph: Record<string, IComponentNode[]> = {}

export const deleteComponentGraph = () => {
    ComponentGraph = {}
}

export const getJSONableComponentGraph = (): Record<string, IComponentNodeJSON[]> => {
    const ComponentGraphJSONable: Record<string, IComponentNodeJSON[]> = {}

    for (const key in ComponentGraph) {
        ComponentGraphJSONable[key] = ComponentGraph[key]
            .reduce((acc: IComponentNodeJSON[], i: IComponentNode) => {
                if (!i.haveRendered) return acc

                i.needsRender = false
                i.haveRendered = false

                if (!i.instance) {
                    acc.push(i as IComponentNodeJSON)
                    return acc
                }

                i.properties = removeUnSavableProperties({...i.instance})
                i.props = deleteFunctionAndClass(i.props)
                i.instance = null

                acc.push(i as IComponentNodeJSON)
                return acc
            }, [])
    }

    return ComponentGraphJSONable as Record<string, IComponentNodeJSON[]>
}

function deleteFunctionAndClass(properties: any) {
    function isInstanceOfAnyClass(value: any) {
        return value.constructor !== Object && !Array.isArray(value) && typeof value === 'object'
    }

    for (const key in properties) {
        if (typeof properties[key] === 'function' || isInstanceOfAnyClass(properties[key])) {
            delete properties[key]
        }
    }

    return properties
}


export function recreateComponentGraph(json: string) {
    ComponentGraph = JSON.parse(json)
}

export function getComponentInstanceFromGraph(componentName: string, componentId: string) {
    const componentNode = ComponentGraph[componentName].find((i: any) => i.id === componentId)

    if (!componentNode) return null
    if (componentNode.instance) return componentNode.instance

    const component = components[componentNode.name]

    componentNode.instance = build(
        component, {
            _parentInstance: componentNode.parent ?? null,
            _parent: componentNode.parent,
            _id: componentNode.id,
            _name: componentNode.name,
        },
        componentNode.props,
        componentNode.properties
    )

    if (componentNode.instance.render === undefined) {
        console.log('instance.render is undefined')
    }

    return componentNode.instance
}

export async function executeMethodOnGraph(componentName: string, componentId: string, property: string, parameters: any) {
    const componentNode = ComponentGraph[componentName].find((i: any) => i.id === componentId)

    if (!componentNode) {
        console.log(`Component ${componentName} with id ${componentId} not found in the graph`)
    }

    const { properties, methods } = componentNode!
    const instance = getComponentInstanceFromGraph(componentName, componentId)

    if (!instance) return false

    if (instance.render === undefined) {
        console.log('instance.render is undefined')
    }

    if (properties.hasOwnProperty(property)) {
        instance[property] = parameters
        componentNode!.needsRender = true
        return true
    }

    if (methods.includes(property)) {
        instance[property](parameters)
        componentNode!.needsRender = true
        return true
    }

    return false
}

function getClassPropsAndMethods(classObject: any) {
    return {
        properties: removeUnSavableProperties({...classObject}),
        methods: getMethods(classObject)
    }
}

export async function getBuiltComponentNode(compName: string, props: any, parent: IComponentNode | null = null) {
    const component = components[compName]

    if (parent) {
        parent.hasChildren = true
    }

    if (ComponentGraph[compName]) {
        const unused = ComponentGraph[compName].find((i: any) => (props.key ? i.key === props.key : true))

        if (unused) {
            unused.needsRender = unused.needsRender || !isEqual(unused.props, props)
            const isInstance = !!unused.instance

            if (!unused.instance) {
                unused.props = props
                unused.instance = build(component, {
                    _parentInstance: parent?.instance ?? null,
                    _parent: parent ? { name: parent.name, id: parent.id } : null,
                    _name: unused.name,
                    _id: unused.id,
                    _key: unused.key ?? null
                }, props, {...unused.properties, ...props})

                await unused.instance?.onPropsChange?.()
            }

            if (unused.instance.render === undefined) {
                console.log('instance.render is undefined')
            }

            return unused
        }
    }

    const instance = build(component, {
        _parentInstance: parent?.instance ?? null,
        _parent: parent ? { name: parent.name, id: parent.id } : null,
        _name: compName,
        _id: nanoid(10),
        _key: props.key ?? null
    }, props)

    const { properties, methods } = getClassPropsAndMethods(instance)

    ComponentGraph[compName] = ComponentGraph[compName] ?? []
    ComponentGraph[compName].push({
        id: instance._id!,
        name: instance._name!,
        key: instance._key!,
        instance: instance,
        props: props,
        properties,
        methods,
        parent: parent ? { name: parent.name, id: parent.id } : null,
        hasChildren: false,
        needsRender: true,
        template: null,
        prevRender: null,
        haveRendered: false
    })

    if (instance.render === undefined) {
        console.log('instance.render is undefined')
    }

    await instance.mount?.()

    return ComponentGraph[compName].find((i: IComponentNode) => i.id === instance._id)
}

export const getMethods = (instance: any) => fp.flow(
    Object.getPrototypeOf,
    Object.getOwnPropertyNames,
    getPublicMethods(instance)
)(instance)

const specialMethods = ['mount', 'prerender', 'render']

const getPublicMethods = (initialize: any) => (methods: string[]) =>
    methods.filter(m =>
        typeof initialize[m] === 'function' &&
        (m !== 'constructor' && m !== 'render') &&
        !m.startsWith('_') &&
        !specialMethods.includes(m)
    )

const removeUnSavableProperties = (props: any): Record<string, any> => {
    const newProps = { ...props }

    for (const key in newProps) {
        if (key.startsWith('_') || newProps[key]?._injectable) {
            delete newProps[key]
        }
    }

    return newProps
}
