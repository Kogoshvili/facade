import { registerComponents, initialize } from 'facade/client/index'
import Button from './components/Button'
import Search from './components/Search'


registerComponents({
    Button,
    Search
})

initialize()
