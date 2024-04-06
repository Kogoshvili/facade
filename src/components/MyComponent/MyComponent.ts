import { Component } from "app/smol/decorators/index";

@Component({
    name: 'MyComponent',
    view: './MyComponent.html'
})
class MyComponent {
    value: number = 0;

    constructor(props: any) {
    }

    onClick(event: Event) {
        this.value++;
    }
}

export default MyComponent


