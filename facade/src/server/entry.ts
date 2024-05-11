import path from 'path'
import express from 'express'
import session from 'express-session'
import compression from 'compression'

import { facadeHTTP, facadeWS } from './Server'

globalThis.fFragment = function fFragment(props) {
	return props.children;
}

globalThis.fElement = function fElement(type, props, ...children) {
    return {
        type,
        props: { ...props, children },
    }
}

const app = express()

export function initServer({
    root,
    port = 3000,
    clientPath,
    sessionConfig = {}
}) {
    const sessionParser = session({
        secret: 'facade',
        resave: true,
        saveUninitialized: true,
        rolling: true,
        cookie: { secure: false }, // Set secure to true if you're using HTTPS
        ...sessionConfig
    })

    app.use(express.json())
    app.use(compression())
    app.use('/static', express.static(path.join(root, clientPath)))
    app.use(sessionParser)

    facadeHTTP(app)

    const server = app.listen(port, () => {
        console.log(`Facade server is listening on port ${port}`)
    })

    facadeWS(server, sessionParser)
}



