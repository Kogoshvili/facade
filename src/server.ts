import express from 'express'
import fs from 'fs'
import MyComponent from 'app/components/MyComponent/MyComponent'
import ChildComponent from 'app/components/ChildComponent/ChildComponent'
import makeComponent from 'smol/factory'
import { renderInstance, renderTemplate, renderPartial, registerPartials, renderPartialWithInstance } from 'app/smol/templater'
import Handlebars from 'handlebars'

const app = express()
const port = 3000
app.use(express.json())
app.use('/static', express.static('C:/projects/FS-Framework/public'))

export const components: Readonly<any> = {
    MyComponent,
    ChildComponent
}

registerPartials(components)

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

    const { id, state, children } = req.body

    const instance = makeComponent(components[componentName], {}, state)
    instance[method]()
    Handlebars.registerPartial(componentName, renderPartialWithInstance(instance))
    const rendered = renderInstance(instance, componentName, id, children)
    Handlebars.registerPartial(componentName, renderPartial)

    res.send(rendered)
})

app.get('/', (_req, res) => {
    const source = fs.readFileSync('C:/projects/FS-Framework/public/index.html', 'utf8')
    res.send(renderTemplate(source, {}, 'root'))
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

