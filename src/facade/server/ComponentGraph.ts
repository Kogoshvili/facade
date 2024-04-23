import GraphConstructor from './Graph'
import { IComponentDeclaration, IComponentNode } from './Interfaces'
import { nanoid } from 'nanoid'
import { signal } from './Signals'
import { getComponent } from './ComponentRegistry'
import { getInjectable, Inject } from './decorators/Injection'

const Graph = new GraphConstructor<string, IComponentNode>()
const Roots = new Set<string>()

export function clearComponentGraph() {
    Graph.clear()
}

export function serializableGraph() {
    return Graph.toJSONable((_, value) => {
        return {
            ...value,
            properties: value.instance ? { ...value.instance } : value.properties,
            instance: null,
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
                    props[key] = signal(oldProps[key].value)
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
    const component = getComponent(vertex.name) as IComponentDeclaration
    const instance = new component.declaration()
    Object.assign(instance, vertex.properties)

    vertex.instance = instance

    if (parent) {
        vertex.instance!._parent = { name: parent.split('/')[0], id: parent.split('/')[1] }
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
    return vertex || null
}

export async function makeComponentNode(name: string, xpath: string, props: Record<string, any>, parent?: IComponentNode | null): Promise<IComponentNode> {
    const instance = new (getComponent(name)!.declaration)()
    instance.recived(props)
    await instance.created()

    Object.getOwnPropertyNames(instance).forEach((p) => {
        if (instance[p]?._injectable) {
            instance[p]._class.prototype._subscribers[name] = {
                read: instance[p]._read,
                write: instance[p]._write
            }
        }
    })

    const properties = Object.getOwnPropertyNames(instance)
        .reduce((acc, prop) => ({ ...acc, [prop]: instance[prop] }), {})

    const vertex: IComponentNode = {
        name,
        id: nanoid(10),
        key: props.key ?? null,
        xpath,
        instance,
        props,
        properties,
        needsRender: true,
        haveRendered: false,
        prevRender: null
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

    if (!vertex) return false

    const instance = vertex.instance ?? rebuildInstance(vertex).instance!

    // check if property exists on the instance
    if (!(property in instance) && isNaN(property as any)) {
        return false
    }

    // check if it is an anonymous function
    if (!isNaN(property as any)) {
        const component = getComponent(componentName)!.declaration
        const stringifiedAnon = component._anonymous[componentName][property]
        const anonToFun = `(function(){(${stringifiedAnon})(...arguments)})`
        eval(anonToFun).call(instance, parameters)
    }

    if (typeof instance[property] !== 'function') {
        instance[property] = parameters
    } else {
        await instance[property](parameters)
    }

    vertex.needsRender = true
    return true
}

export function initComponentInstances(componentName: string) {
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
