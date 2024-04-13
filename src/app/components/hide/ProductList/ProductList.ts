import { Component } from 'facade/server/decorators/index'
import IComponent from 'facade/server/types/component'
import axios from 'axios'

@Component({
    view: './ProductList.html',
})
class ProductList implements IComponent {
    products: any[] = []

    constructor(_props: any) {}

    // executed only once
    async mount() {
        const response: any = await axios.get('https://fakestoreapi.com/products')
        this.products = response.data//getProducts()
    }

    // executed every time the component is rendered
    prerender() {}

    render() {
        return `
            <div>
                <h1>Products</h1>
                <div class="flex">
                    {{#each products}}
                        {{> ProductCard product={self} }}
                    {{/each}}
                </div>
            </div>
        `
    }
}
