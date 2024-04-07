import Component from 'app/smol/component'
import { Component as DComponent } from 'app/smol/decorators/index'

@DComponent({
    name: 'TodoItem',
    view: './TodoItem.html'
})
class TodoItem extends Component {
    todo: string

    constructor(props: any) {
        super(props)
        this.todo = props.todo
    }

    onRemove() {
        this.parent.remove(this.todo)
    }
}

export default TodoItem
