import path from 'path'
import express from 'express'
import session from 'express-session'
import compression from 'compression'

import { registerPages, facadeHTTP, facadeWS } from 'facade/server'

import ShopPage from 'server/pages/ShopPage'
import PDP from 'server/pages/PDP.facade'
import PLP from 'server/pages/PLP'

globalThis.fFragment = function fFragment(props) {
	return props.children;
}

globalThis.fElement = function fElement(type, props, ...children) {
    return {
        type,
        props: { ...props, children },
    }
}

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
    resave: true,
    saveUninitialized: true,
    rolling: true,
    cookie: { secure: false } // Set secure to true if you're using HTTPS
})
app.use(sessionParser)

registerPages({
    'products': PLP,
    'product': PDP,
    'index': ShopPage
})

facadeHTTP(app)

const server = app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

facadeWS(server, sessionParser)



