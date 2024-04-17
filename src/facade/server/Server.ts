import { DiffDOM, stringToObj } from 'diff-dom'
import { diff, flattenChangeset } from 'json-diff-ts'
import { WebSocketServer } from 'ws'
import { getJSONableComponentGraph, executeMethodOnGraph, recreateComponentGraph, deleteComponentGraph } from './ComponentManager'
import { clearInjectables } from './decorators/Injection'
import { renderer } from './JSXRenderer'

export let components: Record<string, any> = {}

const pages: Record<string, any> = {}

export function registerPages(pages: Record<string, any>) {
    Object.keys(pages).forEach((key) => registerPage(key, pages[key]))
}

export function registerPage(path: string, jsx: any) {
    pages[path] = jsx()
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

export function facadeWS(server: any, sessionParser: any, wssConfig: any = {}) {
    const wss = new WebSocketServer({
        noServer: true,
        perMessageDeflate: {
            zlibDeflateOptions: {
                chunkSize: 16 * 1024, // Use larger chunks to improve compression efficiency
                memLevel: 9,          // Use maximum memory for better compression ratio
                level: 9              // Maximum compression level
            },
            zlibInflateOptions: {
                chunkSize: 16 * 1024  // Consistent chunk size with deflate for optimal performance
            },
            clientNoContextTakeover: false, // Do not limit context takeover to enhance compression
            serverNoContextTakeover: false, // Do not limit context takeover to enhance compression
            serverMaxWindowBits: 15,        // Use maximum window bits for better compression
            concurrencyLimit: 1,            // Limit concurrency to reduce CPU usage on server
            threshold: 0                    // Compress all messages regardless of size
        },
        ...wssConfig
    })

    server.on('upgrade', function (request: any, socket: any, head: any) {
        sessionParser(request, {}, () => {
            wss.handleUpgrade(request, socket, head, function (ws: any) {
                wss.emit('connection', ws, request)
            })
        })
    })

    wss.on('connection', async (ws: any, request: any) => {
        ws.on('error', console.error)
        ws.on('close', () => console.log('Client disconnected'))
        ws.on('open', () => console.log('Client connected'))
        const session = request.session as any

        ws.on('message', async (msg: string) => {
            const data = JSON.parse(msg)

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

            const result = JSON.stringify(response)
            ws.send(result)
        })
    })
}


export function facadeHTTP(app: any) {
    app.post('/facade/http', async (req: any, res: any) => {
        const session = req.session as any
        const { page, component: componentName, id: componentId, method, event, mode } = req.query as any

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
        const successful = executeMethodOnGraph(componentName, componentId, property, parameters)

        if (!successful) {
            return res.send(JSON.stringify({ error: `Method/Property ${property} not found on component ${componentName}` }))
        }

        if (mode === 'bind') {
            const oldInstanceTree = JSON.parse(session.instanceTree)
            const newInstanceTree = getJSONableComponentGraph(false)

            session.instanceTree = JSON.stringify(newInstanceTree)

            return res.send(JSON.stringify({
                state: getJSONDiff(oldInstanceTree, newInstanceTree)
            }))
        }

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
        clearInjectables()

        res.send(JSON.stringify(response))
    })


    app.post('/facade/http/set-state', async (req: any, res: any) => {
        const session = req.session as any
        const { page, state } = req.body

        recreateComponentGraph(state)

        const rendered = await RenderDOM(pages[page])
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
        clearInjectables()

        res.send(JSON.stringify(response))
    })

    app.get('/facade/http/get-state', (req: any, res: any) => {
        const session = req.session as any
        const instanceTree = JSON.parse(session.instanceTree)
        res.send(instanceTree)
    })

    app.get('/', async (_req: any, res: any) => {
        res.redirect('/index')
    })

    app.get('/:page', async (req: any, res: any) => {
        const page = req.params.page

        if (!pages[req.params.page]) {
            res.status(404).send('Page not found')
            return
        }

        const session = req.session as any

        const rendered = await RenderDOM(pages[page])
        session.renderedHtmlBody = rendered.match(/(<body[^>]*>([\s\S]*?)<\/body>)/i)?.[0]

        const instanceMap = getJSONableComponentGraph()
        session.instanceTree = JSON.stringify(instanceMap)

        deleteComponentGraph()
        clearInjectables()

        res.send(rendered)
    })
}

