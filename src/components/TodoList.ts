import { Component } from 'facade/server/Component'
import axios from 'axios'

@Component()
class TodoList {
    todos: any[] = []
    inputValue: string = ''

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

    handleAdd({ value }: any) {
        this.todos = [...this.todos, { id: this.todos.length + 1, title: value, completed: false }]
    }

    render() {
        return `
            <div class="p-5">
                <h1 class="text-2xl font-bold mb-4">Todo List</h1>
                <div class="mb-4">
                    <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="new-todo" type="text" placeholder="Add new todo" onchange="{{handleAdd}}">
                    <button class="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" onclick="{{handleAdd}}">Add Todo</button>
                </div>
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
