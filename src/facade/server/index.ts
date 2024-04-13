import { DiffDOM, stringToObj } from 'diff-dom'
import { diff, flattenChangeset } from 'json-diff-ts'
import Templater from './Templater'
import { clearComponentGraph, executeMethodOnGraph, recreateComponentGraph, deleteComponentGraph } from './ComponentManager'
// import NDIMiddleware from 'node-dependency-injection-express-middleware'

export let indexHtml = ''

export let components: Record<string, any> = {}

function registerIndexHtml(html: string) {
    indexHtml = html
}

function registerComponents(comps: Record<string, any>) {
    components = comps
}

function facade(app: any, router: any) {
    // app.use(new NDIMiddleware({
    //     serviceFilePath: 'some/path/to/config.yml'
    // }).middleware())

    router.ws('/facade/ws', async (req: any, res: any) => {
        const ws = await res.accept()
        ws.on('message', async (msg: string) => {
            const data = JSON.parse(msg)
            const session = req.session as any

            const { componentName, componentId, property, parameters, event, mode } = data as any

            if (mode === 'bind') {
                const basicTree = JSON.parse(session.instanceTree)
                basicTree[componentName].find((i: any) => i.id === componentId).properties[property] = parameters
                session.instanceTree = JSON.stringify(basicTree)

                return ws.send(JSON.stringify({}))
            }

            recreateComponentGraph(session.instanceTree)
            executeMethodOnGraph(componentName, componentId, property, parameters)

            const renderer = new Templater({})
            const rendered = await renderer.render(indexHtml, {})
            const response: any = {}

            const oldInstanceTree = JSON.parse(session.instanceTree)
            const instanceMap = clearComponentGraph()
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
        const instanceMap = clearComponentGraph()
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


    router.post('/facade/http/set-state', async (req: any, res: any) => {
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
        const session = req.session as any
        const renderer = new Templater({})
        const rendered = await renderer.render(indexHtml, {})
        const bodyContent = rendered.match(/(<body[^>]*>([\s\S]*?)<\/body>)/i)?.[0]
        session.renderedHtmlBody = bodyContent
        const instanceMap = clearComponentGraph()
        session.instanceTree = JSON.stringify(instanceMap)
        deleteComponentGraph()
        res.send(rendered)
    })
}

export {
    facade,
    registerComponents,
    registerIndexHtml
}

