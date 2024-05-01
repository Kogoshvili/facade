import axios from 'axios'
import TodoItem from './TodoItem'
import { nanoid } from 'nanoid'
import Facade from 'facade/server/Facade'

<script>
    const todos = [];
    const inputValue = '';

    async function created() {
        const { data } = await axios.get('https://jsonplaceholder.typicode.com/todos');
        this.todos = data.slice(0, 1);
    }

    function callback() {
        console.log('Server side TodoList');
    }

    function handleRemove(id) {
        this.todos = this.todos.filter((todo) => todo.id !== id);
    }

    function handleAdd(e) {
        const newTodo = this.inputValue || e.value;
        if (newTodo) {
            this.todos = [...this.todos, { id: nanoid(5), title: newTodo, completed: false }];
        }

        this.inputValue = '';
    }
</script>

<template>
    <div class="p-5">
        <h1 class="text-2xl font-bold mb-4">Todo List</h1>
        <div class="mb-4">
            <Facade component="Button" text="button 1:" onClick={this.callback} />
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
</template>
