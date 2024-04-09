import express from 'express'
import fs from 'fs'
import session from 'express-session'
import { DiffDOM, stringToObj } from 'diff-dom'
import makeComponent from 'smol/factory'
import { renderTemplate, registerPartials, getInstanceTree, resetInstanceTree, jsonInstanceTree, rebuildInstanceTree } from 'app/smol/templater'
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

interface Session {
    renderedHtmlBody: string
    globalState: any
}

const indexHtml = fs.readFileSync('C:/projects/FS-Framework/public/index.html', 'utf8')

export const components: Readonly<any> = {
    MyComponent,
    ChildComponent,
    TodoItem,
    TodoList
}

registerPartials(components)

app.post('/smol', (req, res) => {
    const session = req.session as any
    rebuildInstanceTree(session.instanceTree)
    const { component: componentName, method } = req.query as { component: string, method: string }

    if (!components[componentName]) {
        res.status(400).send(`Component ${componentName} not found`)
        return
    }

    if (typeof components[componentName].prototype[method] !== 'function') {
        res.status(400).send(`Method ${method} not found on component ${componentName}`)
        return
    }

    const { component, parameters } = req.body

    const revers = reverseRelationship(component)

    traverseAndModify(revers, (obj: any, thisType: string, parent: any) => {
        const instance = makeComponent(components[thisType], {
            parent: parent?.instance ?? null,
            id: obj.id,
            name: thisType,
        }, obj.state)
        delete obj.state
        obj.instance = instance
        obj.parent = parent?.instance ? {
            instance: parent?.instance ?? null,
            type: parent.type ?? null,
            id: parent?.id ?? null,
        } : null
    })

    const flatTree = transformObject(revers)
    const instanceTree = flatTree
    const mainInstance: any = flatTree[componentName][0].instance
    mainInstance[method](parameters)
    const source = indexHtml
    const rendered = renderTemplate(source)

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
    rebuildInstanceTree(session.instanceTree)
    const source = indexHtml
    const rendered = renderTemplate(source)
    const bodyContent = rendered.match(/(<body[^>]*>([\s\S]*?)<\/body>)/i)?.[0]
    session.renderedHtmlBody = bodyContent
    session.instanceTree = jsonInstanceTree()
    resetInstanceTree()
    res.send(rendered)
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

function reverseRelationship(input: any) {
    const parentToChildren: any = {}

    const component = Object.keys(input)[0]
    if (Object.keys(input[component].parents).length === 0) {
        return {
            [component]: [
                {
                    ...input[component],
                    children: {},
                }
            ]
        }
    }

    function traverseAndReverse(obj: any, childType: any) {
        const { id, state, parents } = obj
        const newObj = { id, state, children: {} }

        for (const parentType in parents) {
            parents[parentType].forEach((parent: any) => {
                if (!parentToChildren[parentType]) {
                    parentToChildren[parentType] = []
                }

                const parentObj = traverseAndReverse(parent, parentType) as any
                parentToChildren[parentType].push(parentObj)

                if (!parentObj.children[childType]) {
                    parentObj.children[childType] = []
                }
                parentObj.children[childType].push(newObj)
            })
        }

        return newObj
    }

    for (const childType in input) {
        traverseAndReverse(input[childType], childType)
    }

    return parentToChildren
}

function traverseAndModify(tree: any, callback: any) {
    function traverse(obj: any, thisType?: any, parent?: any) {
        callback(obj, thisType, parent)

        for (const childType in obj.children) {
            obj.children[childType].forEach((child: any) => {
                traverse(child, childType, {
                    ...obj,
                    type: thisType,
                })
            })
        }
    }

    for (const parentType in tree) {
        tree[parentType].forEach((parent: any) => {
            traverse(parent, parentType)
        })
    }

    return tree
}

function transformObject(input: any) {
    const output: any = {}

    function liftChildren(items: any, output: any) {
        for (const item of items) {
            if (item.children) {
                for (const childKey in item.children) {
                    if (Array.isArray(item.children[childKey])) {
                        if (!output[childKey]) {
                            output[childKey] = []
                        }
                        output[childKey].push(...item.children[childKey])
                        liftChildren(item.children[childKey], output)
                    }
                }
            }
        }
    }

    for (const key in input) {
        if (Array.isArray(input[key])) {
            output[key] = input[key]
            liftChildren(input[key], output)
        }
    }

    return output
}

