// @ts-nocheck
import { Graph as BaseGraph } from '@datastructures-js/graph'

enum EdgeType {
    Parent = 'Parent',
    Child = 'Child',
    Sibling = 'Sibling'
}

class Graph<K, V> extends BaseGraph<K, V> {
    private _keyAliases: any
    constructor() {
        super()
        this._keyAliases = new Map<K, K>()
        this._componentVertices = new Map<string, string[]>()
    }

    setKeyAliases(aliases: Map) {
        this._keyAliases = aliases
    }

    get keyAliases() {
        return this._keyAliases
    }

    addComponentVertex(name: string, key: K) {
        if (!this._componentVertices.has(name)) {
            this._componentVertices.set(name, [])
        }
        this._componentVertices.get(name).push(key)
    }

    getComponentVertices(name: string) {
        const keys = this._componentVertices.get(name) || []
        return keys.map(key => this.getVertexValue(key)) as V[]
    }

    getRealKey(key: K) {
        return this._keyAliases.get(key)
    }

    addKeyAlias(alias: K, realKey: K) {
        this._keyAliases.set(alias, realKey)
        return this
    }

    addVertex(realKey: K, value: V, aliasKeys?: K[]) {
        if (aliasKeys) {
            aliasKeys.forEach(key => {
                this.addKeyAlias(key, realKey)
            })
        }

        const [name] = realKey.toString().split('/')
        this.addComponentVertex(name, realKey)

        this._vertices.set(realKey, value)
        this.addKeyAlias(realKey, realKey)

        if (!this._edges.has(realKey)) {
            this._edges.set(realKey, new Map())
        }

        return this
    }

    getVertexValue(key: K): V | undefined {
        const realKey = this.getRealKey(key)
        return this._vertices.get(realKey ?? key)
    }

    addEdge(srcKey: K, destKey: K, directional: boolean = true) {
        const realSrcKey = this.getRealKey(srcKey) ?? srcKey

        if (!this._vertices.has(realSrcKey)) {
            throw new Error(`addEdge: vertex "${srcKey}" not found`)
        }

        const realDestKey = this.getRealKey(destKey) ?? destKey

        if (!this._vertices.has(realDestKey)) {
            throw new Error(`addEdge: vertex "${destKey}" not found`)
        }

        this._edges.get(realSrcKey).set(realDestKey, directional ? EdgeType.Parent : EdgeType.Sibling)
        this._edges.get(realDestKey).set(realSrcKey, directional ? EdgeType.Child : EdgeType.Sibling)
        this._edgesCount += 2

        return this
    }

    getParentVertices(key: K) {
        const realKey = this.getRealKey(key) ?? key
        if (!this._edges.has(realKey)) return []

        const result = []
        this._edges.get(realKey).forEach((w, k) => {
            if (w === EdgeType.Parent) {
                result.push(k)
            }
        })
        return result
    }

    getConnectedVertices(key: K) {
        const realKey = this.getRealKey(key) ?? key
        if (!this._edges.has(realKey)) return []

        const result = []
        this._edges.get(realKey).forEach((w, k) => result.push(k))
        return result
    }

    toJSONable(callback?: (key: K, value: V) => any) {
        const vertices = [...this._vertices.entries()]
            .map(([key, value]) => callback ? { key, value: callback(key, value) } : { key, value })

        const edges = [...this._edges.entries()].map(([from, toMap]) => {
            return {
                key: from,
                value: [...toMap.entries()].map(([to, weight]) => ({ key: to, value: weight }))
            }
        })
        const keyAliases = [...this._keyAliases.entries()]

        return {
            vertices,
            edges,
            keyAliases
        }
    }

    fromJSON(json: any, callback?: (key: K, value: V) => V) {
        this.clear()
        this.setKeyAliases(new Map(json.keyAliases))

        for (const vertex of json.vertices) {
            this.addVertex(vertex.key, callback ? callback(vertex.key, vertex.value) : vertex.value)
        }

        for (const edge of json.edges) {
            this._edges.set(edge.key, new Map())
            for (const to of edge.value) {
                this._edges.get(edge.key).set(to.key, to.value)
            }
        }
    }

    clear() {
        this._vertices = new Map()
        this._edges = new Map()
        this._keyAliases = new Map()
        this._edgesCount = 0
    }
}

export default Graph

