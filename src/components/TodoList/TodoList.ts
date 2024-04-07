import Component from 'app/smol/component'
import { Component as DComponent } from 'app/smol/decorators/index'

@DComponent({
    name: 'TodoList',
    view: './TodoList.html',
})
class TodoList extends Component {
    todos: string[] = ['apple', 'banana', 'cherry']

    constructor(props: any) {
        super(props)
    }

    onChange({ value }: any) {
        this.todos.push(value)
    }

    remove(todo: string) {
        this.todos = this.todos.filter(t => t !== todo)
    }
}

export default TodoList


