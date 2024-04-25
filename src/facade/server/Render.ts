import { getGraph, getRoots, rebuildInstance } from './ComponentGraph'
import { getComponentDeclaration } from './ComponentRegistry'
import { getElementById, renderComponent, replaceElementById } from './JSXRenderer'
import { IComponentNode } from './Interfaces'
import { DiffDOM, stringToObj } from 'diff-dom'

export async function render() {
    const [root] = getRoots()
    const graph = getGraph()
    const nodes: IComponentNode[] = []

    graph.traverseDfs(root, async (_, node) => {
        if (node.needsRender && !node.haveRendered) {
            nodes.push(node)
        }
    })

    const nodePromises = nodes.map(async (node) => {
        const declaration = getComponentDeclaration(node.name)
        node.instance = node.instance ?? rebuildInstance(node).instance
        const result = await renderComponent(declaration, node, node.xpath ?? '')
        const idToFind = `${node.name}.${node.id}`
        const oldElement = getElementById(idToFind).outerHTML

        const dd = new DiffDOM()
        const prevBody = stringToObj(oldElement)
        const newBody = stringToObj(result!)
        const domDiff = dd.diff(prevBody, newBody)

        replaceElementById(idToFind, result)

        return {
            id: node.id,
            name: node.name,
            diff: domDiff
        }
    })

    return await Promise.all(nodePromises)
}
