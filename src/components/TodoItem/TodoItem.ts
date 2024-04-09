import { Component } from 'facade/server/decorators/index'
import IComponent from 'facade/server/types/component'
@Component({
    view: './TodoItem.html'
})
class TodoItem implements IComponent {
    todo: string
    isDone: string = ''

    constructor(props: any) {
        this.todo = props.todo
    }

    onRemove() {
        // @ts-ignore
        this._parent.remove(this.todo)
    }

    toggleCheckbox() {
        this.isDone = this.isDone === 'checked' ? '' : 'checked'
    }
}

export default TodoItem
