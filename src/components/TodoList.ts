import { Component } from 'facade/server/decorators/index'
import IComponent from 'facade/server/types/component'
import axios from 'axios'

@Component()
class TodoList implements IComponent {
    todos: any[] = []

    constructor(_props: any) {}

    // executed only once result is cached in redis with session id
    async mount() {
        const { data } = await axios.get('https://jsonplaceholder.typicode.com/todos')
        this.todos = data.slice(0, 5)
    }

    // executed every time the component is rendered
    prerender() {}

    handleRemove(id: number) {
        this.todos = this.todos.filter((todo) => todo.id !== id)
    }

    render() {
        return `
            <div class="p-5">
                <h1 class="text-2xl font-bold mb-4">Todo List</h1>
                <ul class="list-none">
                    {{#each todos}}
                        {{> TodoItem todo={self} class="mb-2" }}
                    {{/each}}
                </ul>
            </div>
        `
    }
}

export default TodoList
