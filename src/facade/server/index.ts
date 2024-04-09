import { DiffDOM, stringToObj } from 'diff-dom'
import { diff, flattenChangeset } from 'json-diff-ts'

import { renderTemplate, registerPartials, resetInstanceTree, jsonInstanceTree, rebuildInstanceTree, recreateInstances, getCleanInstanceTree } from 'app/facade/server/templater'
import processRequest from 'facade/server/utils/processor'

export let indexHtml = ''

export let components: Record<string, any> = {}

function registerIndexHtml(html: string) {
    indexHtml = html
}

function registerComponents(comps: Record<string, any>) {
    components = comps
    registerPartials(comps)
}

function facade(_app: any, router: any) {
    router.ws('/facade/ws', async (req: any, res: any) => {
        const ws = await res.accept()
        ws.on('message', (msg: string) => {
            const data = JSON.parse(msg)
            const { componentName, componentId, method, parameters } = data as { componentName: string, componentId: string, method: string, parameters: any }
            const response = processRequest(req.session, componentName, componentId, method, parameters)
            ws.send(JSON.stringify(response))
        })
    })

    router.post('/facade/http', (req: any, res: any) => {
        const { component: componentName, id: componentId, method } = req.query as { component: string, id: string, method: string }

        if (!components[componentName]) {
            res.status(400).send(`Component ${componentName} not found`)
            return
        }

        if (typeof components[componentName].prototype[method] !== 'function') {
            res.status(400).send(`Method ${method} not found on component ${componentName}`)
            return
        }

        res.send(processRequest(req.session, componentName, componentId, method, req.body.parameters))
    })


    router.post('/facade/http/set-state', (req: any, res: any) => {
        const session = req.session as any
        const state = req.body

        rebuildInstanceTree(JSON.stringify(state))
        recreateInstances()

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
        res.send(response)
    })

    router.get('/facade/http/get-state', (req: any, res: any) => {
        const session = req.session as any
        const instanceTree = JSON.parse(session.instanceTree)
        res.send(instanceTree)
    })

    router.get('/', (req: any, res: any) => {
        const session = req.session as any
        const rendered = renderTemplate(indexHtml)
        const bodyContent = rendered.match(/(<body[^>]*>([\s\S]*?)<\/body>)/i)?.[0]
        session.renderedHtmlBody = bodyContent
        session.instanceTree = jsonInstanceTree()
        resetInstanceTree()
        res.send(rendered)
    })
}

export {
    facade,
    registerComponents,
    registerIndexHtml
}

