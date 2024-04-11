import express from 'express'
import fs from 'fs'
import session from 'express-session'
import compression from 'compression'
import { WebSocketExpress, Router } from 'websocket-express'
import ProductList from 'components/ProductList/ProductList'
import ProductCard from 'components/ProductCard/ProductCard'
import render, { registerComponents } from 'facade/server/templater/engine'

const app = new WebSocketExpress()
const router = new Router()

const port = 3000
app.use(express.json())
app.use(compression())
app.use('/static', express.static('C:/projects/FS-Framework/public'))
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure to true if you're using HTTPS
}))

registerComponents({
    ProductList,
    ProductCard
})

const indexHtml = fs.readFileSync('C:/projects/FS-Framework/src/facade/client/index.html', 'utf8')
// registerIndexHtml(indexHtml)

// facade(app, router)

router.get('/', async (req, res) => {
    const result = await render(indexHtml, {})
    // const session = req.session as any
    // const rendered = renderTemplate(indexHtml)
    // const bodyContent = rendered.match(/(<body[^>]*>([\s\S]*?)<\/body>)/i)?.[0]
    // session.renderedHtmlBody = bodyContent
    // session.instanceTree = jsonInstanceTree()
    // resetInstanceTree()
    res.send(result)
})

app.use(router)

const server = app.createServer()
server.listen(3000, () => {
    console.log(`Example app listening on port ${port}`)
})
