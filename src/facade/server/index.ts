import { DiffDOM, stringToObj } from 'diff-dom'
import { diff, flattenChangeset } from 'json-diff-ts'
import Templater from './Templater'
import { getJSONableComponentGraph, executeMethodOnGraph, recreateComponentGraph, deleteComponentGraph } from './ComponentManager'
import { clearInjectables } from './Injection'

export let components: Record<string, any> = {}

const pages: Record<string, string> = {}

export function registerPage(path: string, indexHtml: string) {
    pages[path] = indexHtml
}

export function registerComponents(comps: Record<string, any>) {
    components = comps
}

export function facade(_app: any, router: any) {
    router.ws('/facade/ws', async (req: any, res: any) => {
        const ws = await res.accept()
        ws.on('message', async (msg: string) => {
            const data = JSON.parse(msg)
            const session = req.session as any

            const { page, componentName, componentId, property, parameters, event: _event, mode } = data as any

            if (mode === 'bind') {
                const oldInstanceTree = JSON.parse(session.instanceTree)
                const newInstanceTree = JSON.parse(session.instanceTree)

                newInstanceTree[componentName].find((i: any) => i.id === componentId).properties[property] = parameters

                const stateDiff = diff(oldInstanceTree, newInstanceTree)

                session.instanceTree = JSON.stringify(newInstanceTree)

                return ws.send(JSON.stringify({
                    state: flattenChangeset(stateDiff)
                }))
            }

            recreateComponentGraph(session.instanceTree)
            const successful = executeMethodOnGraph(componentName, componentId, property, parameters)

            if (!successful) {
                return ws.send(JSON.stringify({ error: `Method/Property ${property} not found on component ${componentName}` }))
            }

            const renderer = new Templater({})
            const rendered = await renderer.render(pages[page ?? 'index'], {})
            const response: any = {}

            const oldInstanceTree = JSON.parse(session.instanceTree)
            const instanceMap = getJSONableComponentGraph()
            const stateDiff = diff(oldInstanceTree, instanceMap)
            response.state = flattenChangeset(stateDiff).filter((i: any) => !(i.key === 'prevRender' || i.key === 'template'))

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
            clearInjectables()

            ws.send(JSON.stringify(response))
        })
    })

    router.post('/facade/http', async (req: any, res: any) => {
        const session = req.session as any
        const { component: componentName, id: componentId, method } = req.query as { component: string, id: string, method: string }

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

        const renderer = new Templater({ noMount: true })
        const rendered = await renderer.render(indexHtml, {})
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

        // const renderer = new Templater({ noMount: true })
        // const rendered = await renderer.render(indexHtml, {})

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

    router.get('/', async (req: any, res: any) => {
        res.redirect('/index')
    })

    router.get('/:page', async (req: any, res: any) => {
        const path = req.params.page === '' ? 'index' : req.params.page
        const session = req.session as any
        const renderer = new Templater({})
        const rendered = await renderer.render(pages[path], {})
        const bodyContent = rendered.match(/(<body[^>]*>([\s\S]*?)<\/body>)/i)?.[0]
        session.renderedHtmlBody = bodyContent
        const instanceMap = getJSONableComponentGraph()
        session.instanceTree = JSON.stringify(instanceMap)
        deleteComponentGraph()
        clearInjectables()
        res.send(rendered)
    })
}

