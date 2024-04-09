import { Component } from 'app/smol/decorators/index'
import IComponent from 'app/smol/types/component'

@Component({
    view: './TodoItem.html'
})
class TodoItem implements IComponent {
    todo: string

    constructor(props: any) {
        this.todo = props.todo
    }

    onRemove() {
        this._parent.remove(this.todo)
    }
}

export default TodoItem
