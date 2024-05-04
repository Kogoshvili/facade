import { signal, ISignal, Injectable } from 'facade/server'

@Injectable()
class CartService {
    cart: ISignal<[]> = signal([])

    addToCart(item: any) {
        // @ts-ignore
        this.cart([...this.cart(), item])
        console.log('Added to cart')
    }

    removeFromCart(item: any) {

    }
}

export default CartService
