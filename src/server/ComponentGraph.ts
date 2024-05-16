import { nanoid } from 'nanoid'
import GraphConstructor from './Graph'
import { IComponentNode } from './Interfaces'
import { PROP_RECIVER, SIGNAL_CALLBACK, prop, signal } from './Signals'
import { buildComponent, getAnonymousMethod, getComponentDeclaration } from './ComponentRegistry'
import { callWithContext, callWithContextAsync } from './Context'
import { getInjectable, inject } from './Injection'
import { getRequestType } from './Server'
import { isEmpty } from 'lodash'

const Graph = new GraphConstructor<string, IComponentNode>()
const Roots = new Set<string>()

const componentsToRerender = new Set<string>()

export function getComponentsToRerender() {
    return componentsToRerender
}

export function clearComponentsToRerender() {
    componentsToRerender.clear()
}

export function getRoots() {
    return Roots
}

export function getGraph() {
    return Graph
}

export function clearComponentGraph() {
    Graph.clear()
}

export function markToRender(componentName: string, componentId: string) {
    const vertexIds = getVertexIds({ name: componentName, id: componentId })
    componentsToRerender.add(vertexIds.any)
    const vertex = Graph.getVertexValue(vertexIds.any)

    if (!vertex) return

    vertex.needsRender = true
}

export function serializableGraph() {
    return Graph.toJSONable((_, value) => {
        if (value.instance) {
            value.instance.destroying?.()
        }

        const properties = value.instance ? getProperties(value.instance).properties : value.properties

        return {
            ...value,
            properties,
            instance: null,
            haveRendered: false,
            needsRender: false
        }
    })
}

export function deserializeGraph(json: string) {
    Graph.fromJSON(JSON.parse(json))
}

export function rebuildInstance(vertex: IComponentNode) {
    const parent = Graph.getParentVertices(getVertexIds(vertex).any)
    const instance = buildComponent(vertex.name, vertex.id)
    const declaration = getComponentDeclaration(vertex.name)
    const propsOverwrites: any = {}
    const propMethods: any = {}

    if (vertex.properties) {
        Object.entries(vertex.properties).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                if (value.__type === 'signal') {
                    propsOverwrites[key] = callWithContext(() => signal(value.value), { name: vertex.name, id: vertex.id, declaration, instance})
                    return
                }
                if (value.__type === 'inject') {
                    const injectable = getInjectable(value.value)!
                    propsOverwrites[key] = callWithContext(() => inject(injectable.declaration), { name: vertex.name, id: vertex.id, declaration, instance})
                    return
                }
                if (value.__type === 'prop') {
                    propMethods[key] = value.value
                    return
                }
            }
            propsOverwrites[key] = value
        })
    }

    Object.assign(instance, propsOverwrites)

    vertex.instance = instance

    if (!isEmpty(parent)) {
        vertex.instance._parent = { name: parent[0].split('.')[0], id: parent[0].split('.')[1] }
    }

    return vertex
}

export function getNode({ name, id, xpath }: { name: string | null, id?: string | null, xpath?: string | null }) {
    const vertexIds = getVertexIds({ name, id, xpath })
    return Graph.getVertexValue(vertexIds.any)
}

export function getComponentNode(name: string, xpath: string): IComponentNode | null {
    const vertexIds = getVertexIds({ name, xpath })
    const vertex = Graph.getVertexValue(vertexIds.any)

    if (!vertex && getRequestType() === 'page') {
        const vertecis = Graph.getComponentVertices(name)
        const freeVertex = vertecis.find(v => v.haveRendered === false && v.needsRender === false)
        return freeVertex ?? null
    }

    return vertex ?? null
}

export function populateProps(instance: any, props: Record<string, any>) {
    Object.entries(instance).forEach(([key, value]) => {
        if (typeof value === 'function' && value.name === PROP_RECIVER) {
            instance[key] = value(props)
        }
    })
    instance?.recived(props)
}

export async function makeComponentNode(name: string, xpath: string, props: Record<string, any>, parent?: IComponentNode | null, oldId?: string): Promise<IComponentNode> {
    const id = oldId ?? nanoid(10)
    const instance = buildComponent(name, id)
    const declaration = getComponentDeclaration(name)

    instance._key = props.key ?? null

    const context = { name, id, declaration, instance };
    callWithContext(() => populateProps(instance, props), context)
    await callWithContextAsync(() => instance.created(), context)
    // TODO: effect function or array
    callWithContext(() => instance.effects.forEach((effect: any) => effect()), context)
    await callWithContextAsync(() => instance.mounted(), context)

    const { properties, methods } = getProperties(instance)

    const vertex: IComponentNode = {
        name,
        id,
        key: props.key ?? null,
        xpath,
        instance,
        props,
        properties,
        methods,
        needsRender: true,
        haveRendered: false,
        hasChildren: false,
    }

    const vertexIds = getVertexIds(vertex)
    Graph.addVertex(vertexIds.id!, vertex, [vertexIds.xpath!])

    if (parent) {
        const parentIds = getVertexIds(parent)
        instance._parent = { name: parent.name, id: parent.id }
        Graph.addEdge(vertexIds.id!, parentIds.any)
    } else {
        Roots.add(vertexIds.id!)
    }

    return vertex
}

export async function executeOnGraph(componentName: string, componentId: string, property: string, parameters: any, mode: string) {
    const vertexIds = getVertexIds({ name: componentName, id: componentId })
    const vertex = Graph.getVertexValue(vertexIds.any)
    const declaration = getComponentDeclaration(componentName)
    const result = [false, undefined] as [boolean, any]

    if (!vertex) return result

    vertex.instance ??= rebuildInstance(vertex).instance!

    // check if property exists on the instance
    if (!(property in vertex.instance) && isNaN(property as any)) {
        return result
    }

    // check if it is an anonymous function
    if (!isNaN(property as any)) {
        const anonFunction = getAnonymousMethod(componentName, Number(property))
        const anonToFun = `(function(){(${anonFunction})(...arguments)})`
        result[1] = await callWithContextAsync(() => eval(anonToFun).call(vertex.instance, parameters),
            { name: componentName, id: componentId, declaration, instance: vertex.instance })
    } else if (typeof vertex.instance[property] !== 'function') {
        vertex.instance[property] = parameters
    } else {
        result[1] = await callWithContextAsync(() => vertex.instance![property](parameters),
            { name: componentName, id: componentId, declaration, instance: vertex.instance })
    }

    result[0] = true

    return result
}

export function makeSureInstancesExist(componentName: string) {
    const vertices = Graph.getComponentVertices(componentName)

    for (const vertex of vertices) {
        // component wasn't rendered before
        if (!vertex) continue
        if (!vertex.instance) {
            rebuildInstance(vertex)
        }
    }

    return vertices
}

function getVertexIds({ name, id, xpath }: { name: string | null, id?: string | null, xpath?: string | null }) {
    const keys = {
        id: id ? `${name}.${id}` : null,
        xpath: xpath ? `${name}.${xpath}` : null,
    }

    return {
        ...keys,
        any: (keys.id || keys.xpath) as string
    }
}

const hiddenProperties = [
    'constructor', 'setState', 'forceUpdate', 'render',
    'context', 'props', 'state', 'effects',
    '_parent', '_parentInstance', '_isMounted',
]

export function getProperties(obj: any): { properties: Record<string, any>, methods: string[] } {
    const properties: Record<string, any> = {}
    const methods: string[] = []

    const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(obj))
        .map((key) => [key, obj[key]])
    const props = Object.entries(obj).concat(proto as [string, any][])

    props.forEach(([key, value]) => {
        if (hiddenProperties.includes(key)) return
        if (typeof value !== 'function') {
            properties[key] = value
        } else {
            if (value.name === SIGNAL_CALLBACK) {
                properties[key] = value.prototype.toJSON()
            } else {
                methods.push(key)
            }
        }
    })

    return { properties, methods }
}
