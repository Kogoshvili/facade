import { DirectedGraph } from '@datastructures-js/graph'

const graph = new DirectedGraph()

// Example vertex
const vertex = {
    name: 'Component',
    declaration: 'class declaration',
    instance: 'class instance',
    methods: ['method1', 'method2'],
    properties: ['property1', 'property2'],
    instances: [
        {
            id: '1',
            key: '1',
            props: [{ key: 'foo', value: 'bar' }],
            properties: [{ key: 'foo', value: 'bar' }, { key: 'baz', value: 'bax' }],
        }
    ]
}


graph.addVertex('A', {
    name: 'ComponentA',
    instances: [{
        id: '1',
        state: {
            foo: 'bar'
        }
    }]
})

graph.addVertex('B', {
    name: 'ComponentB',
    instances: [{
        id: '1',
        state: {
            foo: 'bar'
        }
    }]
})

graph.addVertex('C', {
    name: 'ComponentC',
    instances: [{
        id: '1',
        state: {
            foo: 'bar'
        }
    }]
})

graph.addVertex('D', {
    name: 'ComponentD',
    instances: [
        {
            id: '1',
            state: {
                foo: 'bar'
            }
        },
        {
            id: '2',
            state: {
                foo: 'baz'
            }
        },
        {
            id: '3',
            state: {
                foo: 'bax'
            }
        }
    ]
})


graph.addEdge('A', 'C')
graph.addEdge('A', 'B')
graph.addEdge('B', 'D')



graph.traverseDfs('A', (key, value) => console.log(`${key}: ${JSON.stringify(value.instances, null, 2)}`))
console.log('-------------------')
function serializeGraph(graph, start) {
    let graphData = {
        vertices: {},
        edges: []
    }

    graph.traverseBfs(start, (vertexKey, vertexValue) => {
        graphData.vertices[vertexKey] = vertexValue
        let connectedVertices = graph.getConnectedVertices(vertexKey)
        connectedVertices.forEach(connectedVertexKey => {
            graphData.edges.push({from: vertexKey, to: connectedVertexKey})
        })
    })

    return JSON.stringify(graphData, null, 2)
}

function deserializeGraph(json) {
    let graphData = JSON.parse(json)
    let graph = new DirectedGraph()

    for (let vertexKey in graphData.vertices) {
        graph.addVertex(vertexKey, graphData.vertices[vertexKey])
    }

    graphData.edges.forEach(edge => {
        graph.addEdge(edge.from, edge.to)
    })

    return graph
}
const serializedGraph = serializeGraph(graph, 'A')
// console.log(serializedGraph)
// Map.prototype.toJSON = function() {
//     return [...this.entries()]
// }

// const jsoned = JSON.stringify(graph, null, 2)

// const parsed = JSON.parse(jsoned)

// console.log(parsed)

const deserializedGraph = deserializeGraph(serializedGraph)
// console.log(deserializedGraph)
deserializedGraph.traverseDfs('A', (key, value) => console.log(`${key}: ${JSON.stringify(value.instances, null, 2)}`))
