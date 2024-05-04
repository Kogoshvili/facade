import GraphConstructor from './Graph'
import { IComponentNode } from './Interfaces'
import { nanoid } from 'nanoid'
import { signal } from './Signals'
import { buildComponent, getComponentDeclaration } from './ComponentRegistry'
import { callWithContext, callWithContextAsync } from './Context'
import { getInjectable, Inject } from './Injection'

const Graph: GraphConstructor<string, IComponentNode> = globalThis.Graph ??= new GraphConstructor<string, IComponentNode>()
const Roots = new Set<string>()

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
    const vertex = Graph.getVertexValue(vertexIds.any)

    if (!vertex) return

    vertex.needsRender = true
}

export function serializableGraph() {
    return Graph.toJSONable((_, value) => {
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
    const parent = Graph.getParentVertices(getVertexIds(vertex).any)[0]
    const instance = buildComponent(vertex.name)
    const propsOverwrites: any = {}

    if (vertex.properties) {
        Object.entries(vertex.properties).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                if (value.__type === 'signal') {
                    propsOverwrites[key] = signal(value.value)
                    return
                }
                if (value.__type === 'inject') {
                    const injectable = getInjectable(value.value)!
                    propsOverwrites[key] = Inject(injectable.declaration)
                    return
                }
            }
            propsOverwrites[key] = value
        })
    }

    Object.assign(instance, propsOverwrites)

    vertex.instance = instance
    // vertex.needsRender = true

    if (parent) {
        vertex.instance!._parent = { name: parent.split('/')[0], id: parent.split('/')[1] }
    }

    callWithContext(() => vertex.instance!.mounted(), vertex.name, null, vertex.instance)

    return vertex
}

export function getNode({ name, id, xpath }: { name: string | null, id?: string | null, xpath?: string | null }) {
    const vertexIds = getVertexIds({ name, id, xpath })
    return Graph.getVertexValue(vertexIds.any)
}

export function getComponentNode(name: string, xpath: string): IComponentNode | null {
    const vertexIds = getVertexIds({ name, xpath })
    const vertex = Graph.getVertexValue(vertexIds.any)
    return vertex || null
}

export async function makeComponentNode(name: string, xpath: string, props: Record<string, any>, parent?: IComponentNode | null): Promise<IComponentNode> {
    const instance = buildComponent(name)

    instance._id = nanoid(10)
    instance._name = name
    instance._key = props.key ?? null

    callWithContext(() => instance.recived(props), name, null, instance)
    await callWithContextAsync(() => instance.created(), name, null, instance)

    const { properties, methods } = getProperties(instance)

    const vertex: IComponentNode = {
        name,
        id: instance._id,
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
        const component = getComponentDeclaration(componentName) as any
        const stringifiedAnon = component._anonymous[componentName][property]
        const anonToFun = `(function(){(${stringifiedAnon})(...arguments)})`
        result[1] = await callWithContextAsync(() => eval(anonToFun).call(vertex.instance, parameters),
            componentName, declaration, vertex.instance)
    } else if (typeof vertex.instance[property] !== 'function') {
        vertex.instance[property] = parameters
    } else {
        result[1] = await callWithContextAsync(() => vertex.instance![property](parameters),
            componentName, declaration, vertex.instance)
    }

    result[0] = true

    if (mode !== 'defer') {
        // vertex.needsRender = true
    }

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
        id: id ? `${name}/${id}` : null,
        xpath: xpath ? `${name}/${xpath}` : null,
    }

    return {
        ...keys,
        any: (keys.id || keys.xpath) as string
    }
}

const hiddenProperties = [
    'constructor', 'setState', 'forceUpdate', 'render',
    'context', 'props', 'state',
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
            if (value.name === 'signalF') {
                properties[key] = value.prototype.toJSON()
            } else {
                methods.push(key)
            }
        }
    })

    return { properties, methods }
}
