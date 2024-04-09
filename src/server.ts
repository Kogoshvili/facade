import express from 'express'
import fs from 'fs'
import session from 'express-session'
import { DiffDOM, stringToObj } from 'diff-dom'
import { diff, flattenChangeset } from 'json-diff-ts'
import { renderTemplate, registerPartials, resetInstanceTree, jsonInstanceTree, rebuildInstanceTree, recreateInstances, getInstance, getCleanInstanceTree, getInstanceTree } from 'app/smol/templater'
import TodoItem from './components/TodoItem/TodoItem'
import TodoList from './components/TodoList/TodoList'
import MyComponent from './components/MyComponent/MyComponent'
import ChildComponent from './components/ChildComponent/ChildComponent'

const app = express()
const port = 3000
app.use(express.json())
app.use('/static', express.static('C:/projects/FS-Framework/public'))
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure to true if you're using HTTPS
}))

const indexHtml = fs.readFileSync('C:/projects/FS-Framework/public/index.html', 'utf8')

export const components: Readonly<any> = {
    MyComponent,
    ChildComponent,
    TodoItem,
    TodoList
}

registerPartials(components)

app.post('/smol', (req, res) => {
    const { component: componentName, id: componentId, method } = req.query as { component: string, id: string, method: string }

    if (!components[componentName]) {
        res.status(400).send(`Component ${componentName} not found`)
        return
    }

    if (typeof components[componentName].prototype[method] !== 'function') {
        res.status(400).send(`Method ${method} not found on component ${componentName}`)
        return
    }

    const session = req.session as any
    rebuildInstanceTree(session.instanceTree)
    recreateInstances()

    const { parameters } = req.body
    const instance = getInstance(componentName, componentId)
    instance.instance[method](parameters)
    const rendered = renderTemplate(indexHtml)

    const response: any = {}


    const oldInstanceTree = JSON.parse(session.instanceTree)
    const instanceMap = getCleanInstanceTree()
    const stateDiff = diff(oldInstanceTree, instanceMap)
    response.state = flattenChangeset(stateDiff)

    const newBody = rendered.match(/(<body[^>]*>([\s\S]*?)<\/body>)/i)?.[0]


    if (session.renderedHtmlBody) {
        const dd = new DiffDOM()
        const prevBody = stringToObj(session.renderedHtmlBody)
        const domDiff = dd.diff(prevBody, newBody!)
        response.dom = domDiff//JSON.stringify(domDiff)
    }

    session.renderedHtmlBody = newBody
    session.instanceTree = JSON.stringify(instanceMap)

    resetInstanceTree()

    res.send(response)
})

app.get('/sync-state', (req, res) => {
    const session = req.session as any
    const instanceTree = JSON.parse(session.instanceTree)
    res.send(instanceTree)
})

app.get('/', (req, res) => {
    const session = req.session as any
    const rendered = renderTemplate(indexHtml)
    const bodyContent = rendered.match(/(<body[^>]*>([\s\S]*?)<\/body>)/i)?.[0]
    session.renderedHtmlBody = bodyContent
    session.instanceTree = jsonInstanceTree()
    resetInstanceTree()
    res.send(rendered)
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
