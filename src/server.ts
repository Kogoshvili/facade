import path from 'path'
import express from 'express'
import session from 'express-session'
import compression from 'compression'

import { registerPages, facadeHTTP, facadeWS } from 'facade/server'

import TodoPage from 'pages/TodoPage'
import ShopPage from 'pages/ShopPage'

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

registerPages({
    'index': TodoPage,
    'shop': ShopPage
})

facadeHTTP(app)

const server = app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

facadeWS(server, sessionParser)



