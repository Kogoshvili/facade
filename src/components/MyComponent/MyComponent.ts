import { Component } from 'app/smol/decorators/index'

@Component({
    name: 'MyComponent',
    view: './MyComponent.html',
    style: './MyComponent.css',
})
class MyComponent {
    value: number = 0

    constructor(_props: any) {
    }

    onClick(_event: Event) {
        this.value++
    }
}

export default MyComponent


