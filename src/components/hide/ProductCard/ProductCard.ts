import { Component } from 'facade/server/decorators/index'
import IComponent from 'facade/server/types/component'

@Component({
    view: './ProductCard.html',
})
class ProductCard implements IComponent {
    product: any

    constructor(_props: any) {
        this.product = _props.product
    }

    // executed only once
    mount() {}

    // executed every time the component is rendered
    prerender() {}

    render() {
        return `
            <div>
                <div class="card">
                    <img src="{{product.image}}" alt="{{product.name}}">
                    <div class="card-body">
                        <h2>{{product.name}}</h2>
                        <p>{{product.description}}</p>
                        <p>{{product.price}}</p>
                        <button>Add to cart</button>
                    </div>
                </div>
            </div>
        `
    }
}

export default ProductCard

