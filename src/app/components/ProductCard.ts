import { Component, IComponent } from 'facade/server/Component'
import ModalService from '../services/ModalService'
import { Inject } from 'facade/server/Injection'

@Component()
class ProductCard implements IComponent{
    product: any
    // @ts-ignore
    @Inject(ModalService) modalService: ModalService

    // executes every time the component is rendered
    constructor() { }

    // executed every time the component is rendered
    setProps(props: any) {
        this.product = props.product
        this.product.description = truncate(this.product.description, 100)
    }

    // executed only once
    async mount() {}

    openModal() {
        this.modalService.openModal(this.product)
    }

    render() {
        return `
            <div class="max-w-sm rounded overflow-hidden shadow-lg m-2" @click="openModal">
                <img class="w-full" src="{{product.image}}" alt="{{product.title}}">
                <div class="px-6 py-4">
                    <div class="font-bold text-xl mb-2">{{product.title}}</div>
                    <p class="text-gray-700 text-base">{{product.description}}</p>
                </div>
                <div class="px-6 pt-4 pb-2">
                    <span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">$ {{product.price}}</span>
                </div>
            </div>
        `
    }
}

function truncate(str: string, num: number) {
    if (str.length <= num) return str
    return str.slice(0, num) + '...'
}


export default ProductCard
