import express from 'express'
import fs from 'fs'
import session from 'express-session'
import compression from 'compression'
import { WebSocketExpress, Router } from 'websocket-express'
import { registerIndexHtml, facade, registerComponents } from 'facade/server'
import path from 'path'
import ProductCard from './components/ProductCard'
import ProductList from './components/ProductList'
import Modal from './components/Modal'
import 'reflect-metadata'

const __dirname = path.resolve()
const indexPath = path.join(__dirname, './src/facade/client', 'index.html')

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
    ProductCard,
    ProductList,
    Modal
})



const indexHtml = fs.readFileSync(indexPath, 'utf8')
registerIndexHtml(indexHtml)

facade(app, router)

app.use(router)

const server = app.createServer()
server.listen(3000, () => {
    console.log(`Example app listening on port ${port}`)
})
