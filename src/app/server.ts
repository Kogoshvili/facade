import express from 'express'
import fs from 'fs'
import session from 'express-session'
import compression from 'compression'
import { WebSocketExpress, Router } from 'websocket-express'
import { registerPage, facade, registerComponents } from 'facade/server'
import path from 'path'
import ProductCard from './pages/ecommerce/components/ProductCard'
import ProductList from './pages/ecommerce/components/ProductList'
import Modal from './pages/ecommerce/components/Modal'
import TodoItem from './pages/todo/components/TodoItem'
import TodoList from './pages/todo/components/TodoList'

const __dirname = path.resolve()

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
    Modal,
    TodoItem,
    TodoList
})

const shopHtml = fs.readFileSync(path.join(__dirname, './src/app/pages/', 'ecommerce/index.html'), 'utf8')
const todoHtml = fs.readFileSync(path.join(__dirname, './src/app/pages/', 'todo/index.html'), 'utf8')

registerPage('index', todoHtml)
registerPage('shop', shopHtml)


facade(app, router)

app.use(router)

const server = app.createServer()
server.listen(3000, () => {
    console.log(`Example app listening on port ${port}`)
})
