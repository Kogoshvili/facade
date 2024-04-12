import fp from 'lodash/fp'
import { components } from './index'

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
            i.properties = removeHiddenProperties(i.instance)
            i.state = UseState.Unused
            i.instance = null
            i.parent = i.parent ?? null
            i.children = []
            return i
        })
    }

    return ComponentGraph
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
                    instance.instance = makeComponent(components[instance.name], {
                        _parent: parentInstance.instance,
                        _id: instance.id,
                        _name: instance.name,
                    }, instance.properties)
                    instance.properties = removeHiddenProperties(instance.instance)
                }
            }
        } else {
            instance.instance = makeComponent(components[instance.name], {
                _parent: null,
                _id: instance.id,
                _name: instance.name,
            }, instance.properties)
            instance.properties = removeHiddenProperties(instance.instance)
        }
    }

    for (const component in ComponentGraph) {
        for (const instance of ComponentGraph[component]) {
            resolveInstance(instance)
        }
    }
}

export function executeMethodOnGraph(componentName: string, componentId: string, method: string, parameters: any) {
    const instance = ComponentGraph[componentName].find((i: any) => i.id === componentId)
    const methodResult = instance.instance[method](parameters)

    return methodResult
}

export async function getComponentInstance(compName: string, state: any, parent: any) {
    const component = components[compName]
    let instance = null

    if (ComponentGraph[compName]) {
        ComponentGraph[compName].filter((i: any) => i.state === UseState.InUse).forEach((i: any) => i.state = UseState.Used)
        const unused = ComponentGraph[compName].find((i: any) => i.state === UseState.Unused)

        if (unused) {
            unused.state = UseState.InUse

            if (!unused.instance) {
                const instance = makeComponent(component, {
                    _parent: parent ?? null,
                    _id: unused._id,
                    _name: unused._name,
                }, state)
                unused.instance = instance
            }

            unused.instance.__updateProps(state)
            instance = unused.instance
        }
    }

    if (!instance) {
        const newInstance = makeComponent(component, {
            _parent: parent ?? null,
            _name: compName,
        }, state)

        instance = newInstance

        ComponentGraph[compName] = ComponentGraph[compName] ?? []
        ComponentGraph[compName].push({
            id: instance._id,
            name: instance._name,
            instance: newInstance,
            properties: removeHiddenProperties(instance),
            parent: parent ? { name: parent._name, id: parent._id } : null,
            state: UseState.InUse,
            children: []
        })

        await instance.mount?.()
    }

    return instance
}

function makeComponent(component: any, props: any = {}, state: Record<string, any> = {}): any {
    // eslint-disable-next-line new-cap
    const temp = new component(props)
    temp.__init(props)
    temp.__updateProps(state)
    return temp
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
        [m]: `facade.onClick(event, '${initialize._name}.${initialize._id}.${m}')`
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
