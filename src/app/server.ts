import express from 'express'
import session from 'express-session'
import compression from 'compression'
import { WebSocketExpress, Router } from 'websocket-express'
import { registerPage, facade, registerComponents } from 'facade/server'
import path from 'path'
import ProductCard from './pages/shop/components/ProductCard'
import ProductList from './pages/shop/components/ProductList'
import Modal from './pages/shop/components/Modal'
import TodoItem from './pages/todo/components/TodoItem'
import TodoList from './pages/todo/components/TodoList'

import TodoPage from 'app/app/pages/todo'
import ShopPage from 'app/app/pages/shop'

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

registerPage('index', TodoPage())
registerPage('shop', ShopPage())

facade(app, router)

app.use(router)

const server = app.createServer()
server.listen(3000, () => {
    console.log(`Example app listening on port ${port}`)
})
