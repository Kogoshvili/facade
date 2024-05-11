import { registerPages, initServer } from 'facade/server'

registerPages({})

initServer({
    root: __dirname,
    port: 3000,
    clientPath: '../public'
})
