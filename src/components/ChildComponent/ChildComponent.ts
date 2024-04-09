import { Component } from 'facade/server/decorators/index'

@Component({
    view: './ChildComponent.html',
})
class ChildComponent {
    value: number = 0

    constructor(_props: any) {
    }

    onClick(_event: Event) {
        this.value++
    }
}

export default ChildComponent



