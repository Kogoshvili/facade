import express from 'express'
import fs from 'fs'
import MyComponent from 'app/components/MyComponent/MyComponent'
import ChildComponent from 'app/components/ChildComponent/ChildComponent'
import makeComponent from 'smol/factory'
import { compile, compileInstance } from 'app/smol/templater'

const app = express()
const port = 3000
app.use(express.json())
app.use('/static', express.static('C:/projects/FS-Framework/public'))

export const components: Readonly<any> = {
    MyComponent,
    ChildComponent
}

app.post('/smol', (req, res) => {
    const { component, method } = req.query as { component: string, method: string }

    if (!components[component]) {
        res.status(400).send(`Component ${component} not found`)
        return
    }

    if (typeof components[component].prototype[method] !== 'function') {
        res.status(400).send(`Method ${method} not found on component ${component}`)
        return
    }

    const instance = makeComponent(components[component], {}, req.body)
    instance[method]()
    res.send(compileInstance(instance))
})

app.get('/', (_req, res) => {
    const source = fs.readFileSync('C:/projects/FS-Framework/public/index.html', 'utf8')
    res.send(compile(source, {}, {}, 'root'))
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

