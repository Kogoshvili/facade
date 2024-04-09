import { Component } from 'facade/server/decorators/index'
import IComponent from 'facade/server/types/component'

@Component({
    view: './TodoList.html',
})
class TodoList implements IComponent {
    todos: string[] = []

    constructor(_props: any) {
        this.todos = getTodos()
    }

    // executed only once
    mount() {
        this.todos = getTodos()
    }

    // executed every time the component is rendered
    prerender() {}

    onChange({ value }: any) {
        this.todos.push(value)
    }

    remove(todo: string) {
        this.todos = this.todos.filter(t => t !== todo)
    }
}

function getTodos() {
    const todos = ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew', 'kiwi', 'lemon', 'mango', 'nectarine', 'orange', 'pear', 'quince', 'raspberry', 'strawberry', 'tangerine', 'watermelon']
    return todos.sort(() => Math.random() - 0.5).slice(0, 3)
}

export default TodoList

