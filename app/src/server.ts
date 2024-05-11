import { registerPages, initServer } from 'facade/server'

import ShopPage from 'server/pages/ShopPage'
import PDP from 'server/pages/PDP.facade'
import PLP from 'server/pages/PLP'

registerPages({
    'products': PLP,
    'product': PDP,
    'index': ShopPage
})

initServer({
    root: __dirname,
    port: 3000,
    clientPath: '../public'
})
