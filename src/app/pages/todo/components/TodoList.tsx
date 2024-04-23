import axios from 'axios'
import { AComponent } from 'facade/server'
import TodoItem from './TodoItem'
import { nanoid } from 'nanoid'


class TodoList extends AComponent<any> {
    todos: any[] = []
    inputValue: string = ''

    // executed only once result is cached in redis with session id
    async created() {
        const { data } = await axios.get('https://jsonplaceholder.typicode.com/todos')
        this.todos = data.slice(0, 1)
    }

    handleRemove(id: number) {
        this.todos = this.todos.filter((todo) => todo.id !== id)
    }

    handleAdd({ value }: any) {
        const newTodo = this.inputValue || value
        if (newTodo) {
            this.todos = [...this.todos, { id: nanoid(5), title: newTodo, completed: false }]
        }

        this.inputValue = ''
    }

    static render(this: TodoList) {
        return (
            <div class="p-5">
                <h1 class="text-2xl font-bold mb-4">Todo List</h1>
                <div class="mb-4">
                    <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" value:bind="this.inputValue" placeholder="Add new todo" />
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
