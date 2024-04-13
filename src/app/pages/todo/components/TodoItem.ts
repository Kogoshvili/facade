import { IComponent } from 'app/facade/server/Interfaces'
import { Component } from 'facade/server/Component'

@Component()
class TodoItem implements Partial<IComponent> {
    todo: any
    isCompleted: boolean = false

    constructor(props: any) {
        this.todo = props.todo
    }

    // executed only once
    async mount() {
        this.isCompleted = this.todo.completed
    }

    // executed every time the component is rendered
    prerender() {}

    onRemove() {
        (this as any).parent().handleRemove(this.todo.id)
    }

    handleChange() {
        this.isCompleted = !this.isCompleted
    }

    render() {
        return `
            <li class="flex justify-between items-center bg-gray-100 p-2 rounded-md mb-2">
                <input type="checkbox" class="form-checkbox h-5 w-5 text-blue-600" @change="handleChange" {{#if {isCompleted} }}checked{{/if}}>
                <span class="text-gray-700">{{todo.title}}</span>
                <button class="px-2 py-1 bg-red-500 text-white rounded" onclick="{{onRemove}}">Delete</button>
            </li>
        `
    }
}

export default TodoItem
