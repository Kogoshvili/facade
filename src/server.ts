import express from 'express'
import fs from 'fs'
import session from 'express-session'
import { DiffDOM, stringToObj } from 'diff-dom'
import makeComponent from 'smol/factory'
import { renderTemplate, registerPartials, getInstanceTree, resetInstanceTree, jsonInstanceTree, rebuildInstanceTree, recreateInstances, getInstance } from 'app/smol/templater'
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
    const { component: componentName, id: componentId, method } = req.query as { component: string, method: string }

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

    let response: string = rendered

    const newBody = rendered.match(/(<body[^>]*>([\s\S]*?)<\/body>)/i)?.[0]

    if (session.renderedHtmlBody) {
        const dd = new DiffDOM()
        const prevBody = stringToObj(session.renderedHtmlBody)
        const diff = dd.diff(prevBody, newBody!)
        response = JSON.stringify(diff)
    }

    session.renderedHtmlBody = newBody


    session.instanceTree = jsonInstanceTree()
    resetInstanceTree()
    res.send(response)
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
