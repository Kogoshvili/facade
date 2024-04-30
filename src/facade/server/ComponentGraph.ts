import GraphConstructor from './Graph'
import { IComponentNode } from './Interfaces'
import { nanoid } from 'nanoid'
import { signal } from './Signals'
import { buildComponent, getComponentDeclaration } from './ComponentRegistry'
import { callWithContext, callWithContextAsync } from './Context'
import { getInjectable, Inject } from './Injection'

const Graph = new GraphConstructor<string, IComponentNode>()
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
    Graph.fromJSON(JSON.parse(json), (_key: string, value: IComponentNode) => {
        const props: Record<string, any> = {}
        const oldProps = value.properties

        for (const key in oldProps) {
            if (typeof oldProps[key] === 'object' && oldProps[key] !== null) {
                if (oldProps[key].__type === 'signal') {
                    const prevValue = oldProps[key].value
                    props[key] = signal(prevValue._value)
                    props[key]._dependants = prevValue._dependants
                    continue
                }
                if (oldProps[key].__type === 'inject') {
                    const injectable = getInjectable(oldProps[key].value)!
                    props[key] = Inject(injectable.declaration)
                    continue
                }
            }
            props[key] = oldProps[key]
        }

        return {
            ...value,
            properties: props,
        }
    })
}

export function rebuildInstance(vertex: IComponentNode) {
    const parent = Graph.getParentVertices(getVertexIds(vertex).any)[0]
    const instance = buildComponent(vertex.name)
    Object.assign(instance, vertex.properties)

    vertex.instance = instance
    vertex.needsRender = true

    if (parent) {
        vertex.instance!._parent = { name: parent.split('/')[0], id: parent.split('/')[1] }
    }

    vertex.instance!.mounted()

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

    callWithContext(name, () => instance.recived(props))
    await callWithContextAsync(name, () => instance.created())

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

export async function executeOnGraph(componentName: string, componentId: string, property: string, parameters: any) {
    const vertexIds = getVertexIds({ name: componentName, id: componentId })
    const vertex = Graph.getVertexValue(vertexIds.any)
    const result = [false, undefined] as [boolean, any]

    if (!vertex) return result

    const instance = vertex.instance ?? rebuildInstance(vertex).instance!

    // check if property exists on the instance
    if (!(property in instance) && isNaN(property as any)) {
        return result
    }

    // check if it is an anonymous function
    if (!isNaN(property as any)) {
        const component = getComponentDeclaration(componentName) as any
        const stringifiedAnon = component._anonymous[componentName][property]
        const anonToFun = `(function(){(${stringifiedAnon})(...arguments)})`
        result[1] = eval(anonToFun).call(instance, parameters)
    } else if (typeof instance[property] !== 'function') {
        instance[property] = parameters
    } else {
        result[1] = await instance[property](parameters)
    }

    result[0] = true

    vertex.needsRender = true

    return result
}

export function makeSureInstancesExist(componentName: string) {
    const vertices = Graph.getComponentVertices(componentName)

    for (const vertex of vertices) {
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

function getProperties(obj: any): { properties: Record<string, any>, methods: string[] } {
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
            methods.push(key)
        }
    })

    return { properties, methods }
}
