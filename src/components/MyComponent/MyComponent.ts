import { Component } from 'facade/server/decorators/index'

@Component({
    view: './MyComponent.html',
})
class MyComponent {
    value: number

    constructor(_props: any) {
        this.value = 0
    }

    onClick(_event: Event) {
        this.value++
    }
}

export default MyComponent


