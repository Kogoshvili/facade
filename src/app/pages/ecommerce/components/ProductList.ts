import { Component } from 'facade/server/Component'
import axios from 'axios'
import { IComponent } from 'app/facade/server/Interfaces'


@Component()
class ProductList implements Partial<IComponent> {
    products: any[] = []

    constructor(_props: any) {}

    // executed only once result is cached in redis with session id
    async mount() {
        const { data } = await axios.get('https://fakestoreapi.com/products')
        this.products = data.slice(0, 10)
    }

    // executed every time the component is rendered
    prerender() {}

    render() {
        return `
            <div class="p-5">
                <h1 class="text-2xl font-bold mb-4">Product List</h1>
                <div class="grid grid-cols-6 gap-4">
                    {{#each products}}
                        {{> ProductCard product={self} key={id} }}
                    {{/each}}
                </div>
            </div>
        `
    }
}


export default ProductList
