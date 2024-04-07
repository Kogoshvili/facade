import { Component } from 'app/smol/decorators'

@Component({
    name: 'ChildComponent',
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



