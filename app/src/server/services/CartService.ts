import { signal } from 'facade/server'

class CartService {
    cart = signal<any[]>([])

    addToCart(item: any) {
        // @ts-ignore
        this.cart([...this.cart(), item])
        console.log('Added to cart')
    }

    removeFromCart(item: any) {

    }
}

export default CartService
