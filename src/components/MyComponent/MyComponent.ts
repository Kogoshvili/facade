import { Component } from 'app/smol/decorators/index'

@Component({
    name: 'MyComponent',
    view: './MyComponent.html',
    style: './MyComponent.css',
})
class MyComponent {
    #products: string[] = ['apple', 'banana', 'cherry']

    constructor(_props: any) {
        this.value = 0
    }

    onClick(_event: Event) {
        this.value++
    }
}

export default MyComponent


