import express from 'express';
import MyComponent from "./controller/MyComponent/MyComponent.js";
import ChildComponent from "./controller/ChildComponent/ChildComponent.js";
import ComponentWrapper from "./utils/componentWrapper.js";
import fs from 'fs';
import { compile, registerComponents } from "./templater.js";

const app = express()
const port = 3000
app.use(express.json())
app.use('/static', express.static('C:/projects/FS-Framework'));

const components = {
    MyComponent,
    ChildComponent
};

registerComponents(components);

app.post('/component', (req, res) => {
    const { component, method } = req.query;

    if (!components[component]) {
        res.status(400).send(`Component ${component} not found`);
        return;
    }

    if (typeof components[component].prototype[method] !== 'function') {
        res.status(400).send(`Method ${method} not found on component ${component}`);
        return;
    }
    const comp = components[component];
    const wrapper = ComponentWrapper(comp);
    console.log(req.body)
    const instance = wrapper(req.body);
    instance[method]();
    res.send(instance.render());
});

app.get('/', (req, res) => {
    const source = fs.readFileSync('C:/projects/FS-Framework/index.html', 'utf8')
    res.send(compile(source, {}, {}, 'root'));
})


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

