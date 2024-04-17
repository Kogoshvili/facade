import path from 'path'
import express from 'express'
import session from 'express-session'
import compression from 'compression'
import { WebSocketServer } from 'ws'

import { registerPages, registerComponents, facadeHTTP, facadeWS } from 'facade/server'
import ProductCard from './pages/shop/components/ProductCard'
import ProductList from './pages/shop/components/ProductList'
import Modal from './pages/shop/components/Modal'
import TodoItem from './pages/todo/components/TodoItem'
import TodoList from './pages/todo/components/TodoList'

import TodoPage from 'app/app/pages/todo'
import ShopPage from 'app/app/pages/shop'

const __dirname = path.resolve()

const app = express()
const port = 3000
app.use(express.json())
app.use(compression())
app.use('/static', express.static(path.join(__dirname, '/public')))
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

const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
    // perMessageDeflate: {
    //     zlibDeflateOptions: {
    //         chunkSize: 16 * 1024, // Use larger chunks to improve compression efficiency
    //         memLevel: 9,          // Use maximum memory for better compression ratio
    //         level: 9              // Maximum compression level
    //     },
    //     zlibInflateOptions: {
    //         chunkSize: 16 * 1024  // Consistent chunk size with deflate for optimal performance
    //     },
    //     clientNoContextTakeover: false, // Do not limit context takeover to enhance compression
    //     serverNoContextTakeover: false, // Do not limit context takeover to enhance compression
    //     serverMaxWindowBits: 15,        // Use maximum window bits for better compression
    //     concurrencyLimit: 1,            // Limit concurrency to reduce CPU usage on server
    //     threshold: 0                    // Compress all messages regardless of size
    // }
})

facadeWS(server, wss, sessionParser)



