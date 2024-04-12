import { Component } from 'facade/server/Component'

@Component()
class TodoItem {
    todo: any

    constructor(props: any) {
        this.todo = props.todo
    }

    // executed only once
    async mount() {
    }

    // executed every time the component is rendered
    prerender() {}

    onRemove() {
        (this as any)._parent.handleRemove(this.todo.id)
    }

    render() {
        return `
            <li class="flex justify-between items-center bg-gray-100 p-2 rounded-md mb-2">
                <input type="checkbox" class="form-checkbox h-5 w-5 text-blue-600" {{#if {todo.completed} }}checked{{/if}}>
                <span class="text-gray-700">{{todo.title}}</span>
                <button class="px-2 py-1 bg-red-500 text-white rounded" onclick="{{onRemove}}">Delete</button>
            </li>
        `
    }
}

export default TodoItem
