import { Component } from 'facade/server/Component'
import axios from 'axios'
import TodoItem from './TodoItem'
import { Component as Base } from 'facade/server/base/Component'

@Component()
class TodoList extends Base<any> {
    todos: any[] = []
    inputValue: string = ''

    constructor(props: any) {
        super(props)
    }

    // executed only once result is cached in redis with session id
    async mount() {
        const { data } = await axios.get('https://jsonplaceholder.typicode.com/todos')
        this.todos = data.slice(0, 1)
    }

    onPropsChanged() {}

    // executed every time the component is rendered
    prerender() {}

    handleRemove(id: number) {
        this.todos = this.todos.filter((todo) => todo.id !== id)
    }

    handleAdd({ value }: any) {
        const newTodo = this.inputValue || value
        if (newTodo) {
            this.todos = [...this.todos, { id: this.todos.length + 1, title: newTodo, completed: false }]
        }

        this.inputValue = ''
    }

    test() {
        console.log('Test Method', this.inputValue)
    }

    updateInput({ value }: any) {
        this.inputValue = value
    }

    //  onClick:lazy={() => { this.test() }}
    static render(this: TodoList) {
        return (
            <div class="p-5">
                <h1 class="text-2xl font-bold mb-4">Todo List</h1>
                <div class="mb-4">
                    <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" placeholder="Add new todo" onInput:bind={(v: string) => this.inputValue = v} />
                    <button class="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" onClick={this.handleAdd}>Add Todo</button>
                </div>
                <ul class="list-none">
                    {
                        this.todos.map((todo) => (
                            <TodoItem todo={todo} key={todo.id} />
                        ))
                    }
                </ul>
            </div>
        )
    }
}

export default TodoList
