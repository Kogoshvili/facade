import { diff, flattenChangeset } from 'json-diff-ts'
import { WebSocketServer } from 'ws'
import { clearInjectables, getJSONableInjectables, parseInjectables } from './Injection'
import { clearDOM, clearScripts, clearStyles, getDOM, getScripts, getStyles, setDOM } from './Dom'
import { renderer, rerenderModifiedComponents } from './JSXRenderer'
import { clearComponentGraph, deserializeGraph, serializableGraph, executeOnGraph, clearComponentsToRerender } from './ComponentGraph'
import { DiffDOM, stringToObj, nodeToObj } from 'diff-dom'

// requestType page or component
let requestType = 'page'

export function getRequestType() {
    return requestType
}

const pages: Record<string, any> = {}

export function registerPages(pages: Record<string, any>) {
    Object.keys(pages).forEach((key) => registerPage(key, pages[key]))
}

export function registerPage(path: string, jsx: any) {
    pages[path] = jsx
}

function getJSONDiff(oldInstanceTree: any, newInstanceTree: any) {
    const stateDiff = diff(oldInstanceTree, newInstanceTree)
    return flattenChangeset(stateDiff)
        .filter((i: any) => !(i.key === 'pastRender'))
}

async function RenderDOM(page: string, props: any = {}) {
    return await renderer(fElement(pages[page], props), null, page, null)
}

async function process(session: any, page: string, componentName: string, componentId: string, property: string, parameters: any, mode: string) {
    requestType = 'component'
    console.time('process')

    deserializeGraph(session.instanceTree)
    parseInjectables(session.injectables)

    const [successful, result] = await executeOnGraph(componentName, componentId, property, parameters, mode)

    if (!successful) {
        return { error: `Method/Property ${property} not found on component ${componentName}` }
    }

    if (mode === 'bind') {
        const oldInstanceTree = JSON.parse(session.instanceTree)
        const newInstanceTree = serializableGraph()
        session.instanceTree = JSON.stringify(newInstanceTree)

        return {
            state: getJSONDiff(oldInstanceTree.vertices, newInstanceTree.vertices),
            result
        }
    }

    setDOM(session.body)

    const response: any = { result }

    response.diffs = await rerenderModifiedComponents()

    const newInstanceTree = serializableGraph()
    const oldInstanceTree = JSON.parse(session.instanceTree)
    response.state = getJSONDiff(oldInstanceTree.vertices, newInstanceTree.vertices)

    const scripts = getScripts()
    const oldScripts = session.head.match(/<script[^>]*>[\s\S]*?<\/script>/g) ?? []
    const newScripts = scripts.filter((s) => !oldScripts.includes(s))

    const styles = getStyles()
    const oldStyles = session.head.match(/<link[^>]*>[\s\S]*?<\/link>/g) ?? []
    const newStyles = styles.filter((s) => !oldStyles.includes(s))

    session.head = session.head.replace('</head>', `${newScripts.join('\n')}</head>`).replace('</head>', `${newStyles.join('\n')}</head>`)
    session.body = getDOM().toString()
    session.instanceTree = JSON.stringify(newInstanceTree)
    session.injectables = JSON.stringify(getJSONableInjectables())

    cleanup()

    console.timeEnd('process')
    return response
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
            const { page, componentName, componentId, property, parameters, event: _event, mode } = JSON.parse(msg) as any
            const result = await process(session, page, componentName, componentId, property, parameters, mode)
            session.save((err: any) => console.error(err))
            ws.send(JSON.stringify(result))
        })
    })
}

export function facadeHTTP(app: any) {
    app.post('/facade/http', async (req: any, res: any) => {
        const session = req.session as any
        const { page, component: componentName, id: componentId, property, event, mode } = req.query as any
        const { parameters } = req.body
        const result = await process(session, page, componentName, componentId, property, parameters, mode)
        res.send(JSON.stringify(result))
    })

    app.post('/facade/http/set-state', async (req: any, res: any) => {
        // const session = req.session as any
        // const { page, state } = req.body

        // recreateComponentGraph(state)

        // const rendered = await RenderDOM(pages[page])
        // const response: any = {}

        // const oldInstanceTree = JSON.parse(session.instanceTree)
        // const instanceMap = getJSONableComponentGraph()
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

        // deleteComponentGraph()
        // clearInjectables()

        // res.send(JSON.stringify(response))
    })

    app.get('/facade/http/get-state', (req: any, res: any) => {
        const session = req.session as any
        const instanceTree = JSON.parse(session.instanceTree)
        res.send(instanceTree.vertices)
    })

    app.post('/facade/page/:page', async (req: any, res: any) => {
        console.time('SPA Render')

        const page = req.params.page

        if (!pages[page]) {
            res.status(404).send('Page not found')
            return
        }

        const session = req.session as any

        requestType = 'page'
        if (session.injectables) parseInjectables(session.injectables)
        if (session.instanceTree) deserializeGraph(session.instanceTree)

        const rendered = await RenderDOM(page, { params: req.params, query: req.query })

        const scripts = getScripts()
        const withScripts = rendered.replace('</head>',`${scripts.join('\n')}</head>`)
        const withStyles = withScripts.replace('</head>', `${getStyles().join('\n')}</head>`)

        const response: any = {}

        const dd = new DiffDOM()

        const newBody = getBody(rendered)
        const newHead = getHead(withStyles)

        response.diffs = {
            head: dd.diff(session.head, newHead),
            body: dd.diff(session.body, newBody)
        }

        const newInstanceTree = serializableGraph()
        const oldInstanceTree = JSON.parse(session.instanceTree)
        response.state = getJSONDiff(oldInstanceTree.vertices, newInstanceTree.vertices)

        session.head = newHead
        session.body = newBody
        session.instanceTree = JSON.stringify(newInstanceTree)
        session.injectables = JSON.stringify(getJSONableInjectables())

        cleanup()

        console.timeEnd('SPA Render')
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.send(JSON.stringify(response))
    })

    app.get('/:page', async (req: any, res: any) => {
        console.time('Page Render')
        const page = req.params.page
        // const [page, ...props] = req.params[0].split('/')

        if (!pages[page]) {
            res.status(404).send('Page not found')
            return
        }

        const session = req.session as any

        requestType = 'page'
        if (session.injectables) parseInjectables(session.injectables)
        if (session.instanceTree) deserializeGraph(session.instanceTree)

        const rendered = await RenderDOM(page, { params: req.params, query: req.query })

        const componentGraph = serializableGraph()

        const withScripts = rendered.replace('</head>',`${getScripts().join('\n')}</head>`)
        const withStyles = withScripts.replace('</head>', `${getStyles().join('\n')}</head>`)

        session.head = getHead(withStyles)
        session.body = getBody(withStyles)
        session.instanceTree = JSON.stringify(componentGraph)
        session.injectables = JSON.stringify(getJSONableInjectables())

        const withScriptsAndState = withStyles.replace(
            '</body>',
            `<script type="text/javascript" id="facade-state">
                if (!window.facade) {
                    window.facade = {}
                }
                console.debug('Facade Setting state')
                window.facade.state = ${JSON.stringify(componentGraph.vertices)}
                document.getElementById('facade-state').remove()
            </script>
            </body>`
        )

        cleanup()

        console.timeEnd('Page Render')
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.send(withScriptsAndState)
    })

    app.get('/', async (_req: any, res: any) => {
        res.redirect('/index')
    })
}

function getBody(rendered: string): string {
    return rendered.match(/(<body[^>]*>([\s\S]*?)<\/body>)/i)?.[0] ?? ''
}

function getHead(rendered: string): string {
    return rendered.match(/(<head[^>]*>([\s\S]*?)<\/head>)/i)?.[0] ?? ''
}

function cleanup() {
    clearComponentGraph()
    clearInjectables()
    clearComponentsToRerender()
    clearDOM()
    clearScripts()
    clearStyles()
}
