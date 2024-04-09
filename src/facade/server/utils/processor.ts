import { DiffDOM, stringToObj } from 'diff-dom'
import { diff, flattenChangeset } from 'json-diff-ts'
import { renderTemplate, resetInstanceTree, rebuildInstanceTree, recreateInstances, getInstance, getCleanInstanceTree } from 'facade/server/templater'
import { indexHtml } from 'facade/server/index'

function processRequest(session: any, componentName: string, componentId: string, method: string, parameters: any) {
    rebuildInstanceTree(session.instanceTree)
    recreateInstances()

    const instance = getInstance(componentName, componentId)
    instance.instance[method](parameters)
    const rendered = renderTemplate(indexHtml)

    const response: any = {}

    const oldInstanceTree = JSON.parse(session.instanceTree)
    const instanceMap = getCleanInstanceTree()
    const stateDiff = diff(oldInstanceTree, instanceMap)
    response.state = flattenChangeset(stateDiff)

    const newBodyString = rendered.match(/(<body[^>]*>([\s\S]*?)<\/body>)/i)?.[0]

    if (session.renderedHtmlBody) {
        const dd = new DiffDOM()
        const prevBody = stringToObj(session.renderedHtmlBody)
        const newBody = stringToObj(newBodyString!)
        const domDiff = dd.diff(prevBody, newBody)
        response.dom = domDiff
    }

    session.renderedHtmlBody = newBodyString
    session.instanceTree = JSON.stringify(instanceMap)

    resetInstanceTree()
    return response
}

export default processRequest
