import path from 'path'
import express from 'express'
import session from 'express-session'
import compression from 'compression'

import { registerPages, registerComponents, facadeHTTP, facadeWS } from 'facade/server'
import ProductCard from 'pages/shop/components/ProductCard'
import ProductList from 'pages/shop/components/ProductList'
import Modal from 'pages/shop/components/Modal'
import TodoItem from 'pages/todo/components/TodoItem'
import TodoList from 'pages/todo/components/TodoList'

import TodoPage from 'app/app/pages/todo'
import ShopPage from 'app/app/pages/shop'
import Wrapper from 'pages/shop/components/Wrapper'

// @ts-ignore
if (__dirname === undefined) {
    // eslint-disable-next-line no-global-assign
    __dirname = path.resolve()
}

const app = express()
const port = 3000
app.use(express.json())
app.use(compression())
app.use('/static', express.static(path.join(__dirname, '..', 'public')))
const sessionParser = session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure to true if you're using HTTPS
})
app.use(sessionParser)

registerComponents({
    ProductCard,
    ProductList,
    Modal,
    Wrapper,
    TodoItem,
    TodoList
})

registerPages({
    'index': TodoPage,
    'shop': ShopPage
})

facadeHTTP(app)

const server = app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

facadeWS(server, sessionParser)



