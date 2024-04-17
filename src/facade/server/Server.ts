import { DiffDOM, stringToObj } from 'diff-dom'
import { diff, flattenChangeset } from 'json-diff-ts'
import { getJSONableComponentGraph, executeMethodOnGraph, recreateComponentGraph, deleteComponentGraph } from './ComponentManager'
import { clearInjectables } from './decorators/Injection'
import { renderer } from './JSXRenderer'


export let components: Record<string, any> = {}

const pages: Record<string, any> = {}

export function registerPage(path: string, jsx: any) {
    pages[path] = jsx
}

export function registerComponents(comps: Record<string, any>) {
    components = comps
}

function getJSONDiff(oldInstanceTree: any, newInstanceTree: any) {
    const stateDiff = diff(oldInstanceTree, newInstanceTree)
    return flattenChangeset(stateDiff)
        .filter((i: any) => !(i.key === 'prevRender' || i.key === 'template'))
}

async function RenderDOM(page: any) {
    const rendered = await renderer(page)
    return `<!DOCTYPE html> <html> ${rendered} </html>`
}

export function facade(_app: any, router: any) {
    router.ws('/facade/ws', async (req: any, res: any) => {
        const ws = await res.accept()
        ws.on('message', async (msg: string) => {
            const data = JSON.parse(msg)
            const session = req.session as any

            const { page, componentName, componentId, property, parameters, event: _event, mode } = data as any

            recreateComponentGraph(session.instanceTree)
            const successful = executeMethodOnGraph(componentName, componentId, property, parameters)

            if (!successful) {
                return ws.send(JSON.stringify({ error: `Method/Property ${property} not found on component ${componentName}` }))
            }

            if (mode === 'bind') {
                const oldInstanceTree = JSON.parse(session.instanceTree)
                const newInstanceTree = getJSONableComponentGraph(false)

                session.instanceTree = JSON.stringify(newInstanceTree)

                return ws.send(JSON.stringify({
                    state: getJSONDiff(oldInstanceTree, newInstanceTree)
                }))
            }

            const rendered = await RenderDOM(pages[page])
            const response: any = {}

            const newInstanceTree = getJSONableComponentGraph()
            response.state = getJSONDiff(JSON.parse(session.instanceTree), newInstanceTree)

            const oldBodyString = session.renderedHtmlBody
            const newBodyString = rendered.match(/(<body[^>]*>([\s\S]*?)<\/body>)/i)?.[0]

            if (oldBodyString) {
                const dd = new DiffDOM()
                const prevBody = stringToObj(oldBodyString!)
                const newBody = stringToObj(newBodyString!)
                const domDiff = dd.diff(prevBody, newBody)
                response.dom = domDiff
            }

            session.renderedHtmlBody = newBodyString
            session.instanceTree = JSON.stringify(newInstanceTree)

            deleteComponentGraph()
            clearInjectables()

            ws.send(JSON.stringify(response))
        })
    })

    router.post('/facade/http', async (req: any, res: any) => {
        const session = req.session as any
        const { page, component: componentName, id: componentId, method } = req.query as any

        if (!components[componentName]) {
            res.status(400).send(`Component ${componentName} not found`)
            return
        }

        if (typeof components[componentName].prototype[method] !== 'function') {
            res.status(400).send(`Method ${method} not found on component ${componentName}`)
            return
        }

        const { parameters } = req.body

        recreateComponentGraph(session.instanceTree)
        executeMethodOnGraph(componentName, componentId, method, parameters)

        const rendered = await renderer(pages[page])
        const response: any = {}

        const oldInstanceTree = JSON.parse(session.instanceTree)
        const instanceMap = getJSONableComponentGraph()
        const stateDiff = diff(oldInstanceTree, instanceMap)
        response.state = flattenChangeset(stateDiff)

        const oldBodyString = session.renderedHtmlBody
        const newBodyString = rendered.match(/(<body[^>]*>([\s\S]*?)<\/body>)/i)?.[0]

        if (oldBodyString) {
            const dd = new DiffDOM()
            const prevBody = stringToObj(oldBodyString!)
            const newBody = stringToObj(newBodyString!)
            const domDiff = dd.diff(prevBody, newBody)
            response.dom = domDiff
        }

        session.renderedHtmlBody = newBodyString
        session.instanceTree = JSON.stringify(instanceMap)

        deleteComponentGraph()

        res.send(JSON.stringify(response))
    })


    router.post('/facade/http/set-state', async (_req: any, _res: any) => {
        // const session = req.session as any
        // const state = req.body

        // rebuildInstanceTree(JSON.stringify(state))
        // recreateInstances()

        // const rendered = await renderer(todoPage())

        // const response: any = {}

        // const oldInstanceTree = JSON.parse(session.instanceTree)
        // const instanceMap = getCleanInstanceTree()
        // const stateDiff = diff(oldInstanceTree, instanceMap)
        // response.state = flattenChangeset(stateDiff)

        // const oldBodyString = session.renderedHtmlBody
        // const newBodyString = rendered.match(/(<body[^>]*>([\s\S]*?)<\/body>)/i)?.[0]

        // if (oldBodyString) {
        //     const dd = new DiffDOM()
        //     const prevBody = stringToObj(oldBodyString!)
        //     const newBody = stringToObj(newBodyString!)
        //     const domDiff = dd.diff(prevBody, newBody)
        //     response.dom = domDiff
        // }

        // session.renderedHtmlBody = newBodyString
        // session.instanceTree = JSON.stringify(instanceMap)

        // resetInstanceTree()

        // res.send(response)
    })

    router.get('/facade/http/get-state', (req: any, res: any) => {
        const session = req.session as any
        const instanceTree = JSON.parse(session.instanceTree)
        res.send(instanceTree)
    })

    router.get('/', async (_req: any, res: any) => {
        res.redirect('/index')
    })

    router.get('/:page', async (req: any, res: any) => {
        const page = req.params.page === '' ? 'index' : req.params.page
        const session = req.session as any
        const rendered = await RenderDOM(pages[page])
        const bodyContent = rendered.match(/(<body[^>]*>([\s\S]*?)<\/body>)/i)?.[0]
        session.renderedHtmlBody = bodyContent
        const instanceMap = getJSONableComponentGraph()
        session.instanceTree = JSON.stringify(instanceMap)
        deleteComponentGraph()
        clearInjectables()
        res.send(rendered)
    })
}
