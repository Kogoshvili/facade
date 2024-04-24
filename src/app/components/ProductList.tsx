import axios from 'axios'
import { AComponent } from 'facade/server'
import ProductCard from './ProductCard'

class ProductList extends AComponent<any> {
    products: any[] = []

    async created() {
        const { data } = await axios.get('https://fakestoreapi.com/products')
        this.products = data.slice(0, 6)
    }

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
