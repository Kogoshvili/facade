import fp from 'lodash/fp'
import { components } from './index'
import build from './Factory'

enum UseState {
    Unused,
    InUse,
    Used
}

export let ComponentGraph: any = {}

export const deleteComponentGraph = () => {
    ComponentGraph = {}
}

export const clearComponentGraph = () => {
    for (const key in ComponentGraph) {
        ComponentGraph[key] = ComponentGraph[key].filter((i: any) => i.state !== UseState.Unused)
        ComponentGraph[key] = ComponentGraph[key].map((i: any) => {
            i.props = deleteFunctionAndClass(i.props)
            i.properties = fp.flow(deleteInjectables, removeHiddenProperties)({...i.instance})
            i.state = UseState.Unused
            i.instance = null
            i.parent = i.parent ?? null
            return i
        })
    }

    return ComponentGraph
}

function deleteFunctionAndClass(properties: any) {
    function isInstanceOfAnyClass(value) {
        return value.constructor !== Object && !Array.isArray(value) && typeof value === 'object'
    }

    for (const key in properties) {
        if (typeof properties[key] === 'function' || isInstanceOfAnyClass(properties[key])) {
            delete properties[key]
        }
    }

    return properties
}



function deleteInjectables(properties: any) {
    for (const key in properties) {
        if (properties[key]?._injectable) {
            delete properties[key]
        }
    }

    return properties
}

export function recreateComponentGraph(json: string) {
    ComponentGraph = JSON.parse(json)

    function resolveInstance(instance: any) {
        if (instance.parent !== null) {
            // find the parent instance
            const parentInstance = ComponentGraph[instance.parent.name].find((parent: any) => parent.id === instance.parent.id)
            // check if the parent instance exists
            if (parentInstance) {
                // check if the parent instance has an instance
                if (parentInstance.instance === null) {
                    resolveInstance(parentInstance)
                } else {
                    instance.instance = build(components[instance.name], {
                        _parent: parentInstance.instance,
                        _id: instance.id,
                        _name: instance.name,
                    }, instance.props, instance.properties)
                }
            }
        } else {
            instance.instance = build(components[instance.name], {
                _parent: null,
                _id: instance.id,
                _name: instance.name,
            }, instance.props, instance.properties)
        }
    }

    for (const component in ComponentGraph) {
        for (const instance of ComponentGraph[component]) {
            resolveInstance(instance)
        }
    }
}

export function executeMethodOnGraph(componentName: string, componentId: string, property: string, parameters: any) {
    const instance = ComponentGraph[componentName].find((i: any) => i.id === componentId)

    if (instance.instance[property] === undefined) {
        return
    }

    if (typeof instance.instance[property] === 'function') {
        return instance.instance[property](parameters)
    }

    instance.instance[property] = parameters
}

export async function getComponentInstance(compName: string, props: any, parent: any) {
    const component = components[compName]
    let instance = null

    if (ComponentGraph[compName]) {
        ComponentGraph[compName].filter((i: any) => i.state === UseState.InUse).forEach((i: any) => i.state = UseState.Used)
        const unused = ComponentGraph[compName].find((i: any) => i.state === UseState.Unused && (props.key ? i.key === props.key : true))

        if (unused) {
            unused.state = UseState.InUse
            instance = unused.instance
        }
    }

    if (!instance) {
        const newInstance = build(component, {
            _parent: parent ?? null,
            _name: compName,
            _key: props.key ?? null
        }, props)

        instance = newInstance

        ComponentGraph[compName] = ComponentGraph[compName] ?? []
        ComponentGraph[compName].push({
            id: instance._id,
            name: instance._name,
            key: instance._key,
            instance: newInstance,
            props: props,
            properties: removeHiddenProperties(instance),
            parent: parent ? { name: parent._name, id: parent._id } : null,
            state: UseState.InUse
        })

        await instance.mount?.()
    }

    return instance
}

export const getMethods = (instance: any) => fp.flow(
    Object.getPrototypeOf,
    Object.getOwnPropertyNames,
    getPublicMethods(instance),
    buildMethodMap(instance)
)(instance)

const specialMethods = ['mount', 'prerender', 'render']

const getPublicMethods = (initialize: any) => (methods: string[]) =>
    methods.filter(m =>
        typeof initialize[m] === 'function' &&
        (m !== 'constructor' && m !== 'render') &&
        !m.startsWith('_') &&
        !specialMethods.includes(m)
    )

const buildMethodMap = (initialize: any) => (methods: string[]) =>
    methods.reduce((acc, m) => ({
        ...acc,
        [m]: `facade.event(event, '${initialize._name}.${initialize._id}.${m}')`
    }), {} as Record<string, string>)

const removeHiddenProperties = (props: any) => {
    const newProps = { ...props }

    for (const key in newProps) {
        if (key.startsWith('_')) {
            delete newProps[key]
        }
    }

    return newProps
}
