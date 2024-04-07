import express from 'express'
import fs from 'fs'
import session from 'express-session'
import { DiffDOM, stringToObj } from 'diff-dom'
import makeComponent from 'smol/factory'
import { renderInstance, renderTemplate, renderPartial, registerPartials, renderPartialWithInstance } from 'app/smol/templater'
import Handlebars from 'handlebars'
import TodoItem from './components/TodoItem/TodoItem'
import TodoList from './components/TodoList/TodoList'

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

export const components: Readonly<any> = {
    TodoItem,
    TodoList
}

registerPartials(components)

export let instanceTree: any = {}

app.post('/smol', (req, res) => {
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
    const session = req.session as any

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
    instanceTree = flatTree
    const mainInstance: any = flatTree[componentName][0].instance
    mainInstance[method](parameters)
    const source = fs.readFileSync('C:/projects/FS-Framework/public/index.html', 'utf8')
    const rendered = renderTemplate(source, {}, 'root')

    let response: string = rendered

    const newBody = rendered.match(/(<body[^>]*>([\s\S]*?)<\/body>)/i)?.[0]

    if (session.renderedHtmlBody) {
        const dd = new DiffDOM()
        const prevBody = stringToObj(session.renderedHtmlBody)
        const diff = dd.diff(prevBody, newBody!)
        response = JSON.stringify(diff)
    }

    session.renderedHtmlBody = newBody
    res.send(response)
})

app.get('/', (req, res) => {
    const source = fs.readFileSync('C:/projects/FS-Framework/public/index.html', 'utf8')
    const rendered = renderTemplate(source, {}, 'root')
    const session = req.session as any
    const bodyContent = rendered.match(/(<body[^>]*>([\s\S]*?)<\/body>)/i)?.[0]
    session.renderedHtmlBody = bodyContent
    res.send(rendered)
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

function reverseRelationship(input: any) {
    const parentToChildren: any = {}

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

function flattenTree(tree: any) {
    const flattenedTree: any = {}
    const childrenReferences: any = {}

    function traverse(obj: any, parentType: string) {
        if (!flattenedTree[parentType]) {
            flattenedTree[parentType] = []
        }
        flattenedTree[parentType].push(obj)

        for (const childType in obj.children) {
            if (!childrenReferences[childType]) {
                childrenReferences[childType] = []
            }
            childrenReferences[childType].push(...obj.children[childType])

            obj.children[childType].forEach((child: any) => {
                traverse(child, childType)
            })

            delete obj.children[childType]
        }
    }

    for (const parentType in tree) {
        tree[parentType].forEach((parent: any) => {
            traverse(parent, parentType)
        })
    }

    for (const childType in childrenReferences) {
        flattenedTree[childType] = childrenReferences[childType]
    }

    return flattenedTree
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

