import { Component } from 'facade/server/Component'
import axios from 'axios'
import { Component as Base } from 'facade/server/base/Component'
import ProductCard from './ProductCard'

@Component()
class ProductList extends Base<any> {
    products: any[] = []

    constructor(props: any) {
        super(props)
    }

    // executed only once result is cached in redis with session id
    async mount() {
        const { data } = await axios.get('https://fakestoreapi.com/products')
        this.products = data.slice(0, 6)
    }

    // executed every time the component is rendered
    prerender() {}

    static render(this: ProductList) {
        return (
            <div class="p-5">
                <h1 class="text-2xl font-bold mb-4">Product List</h1>
                <div class="grid grid-cols-6 gap-4">
                    {
                        this.products.map((product) => (
                            <ProductCard product={product} key={product.id} />
                        ))
                    }
                </div>
            </div>
        )
    }
}


export default ProductList
