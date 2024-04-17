import { Component, AComponent } from 'facade/server'

@Component()
class TodoItem extends AComponent<any> {
    todo: any
    isCompleted: boolean = false

    constructor(props: any) {
        super(props)
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

    test() {
        // this.parent()!.test()
        // console.log('Test Method TodoItem', this.todo.id, this.isCompleted)
    }

    static render(this: TodoItem) {
        return (
            <li class="flex justify-between items-center bg-gray-100 p-2 rounded-md mb-2">
                <input type="checkbox" class="form-checkbox h-5 w-5 text-blue-600" onChange={this.handleChange} checked={this.isCompleted} />
                <div class="text-gray-700" onClick={() => this.todo.title = 'Changed'}>{this.todo.title}</div>
                <button class="px-2 py-1 bg-red-500 text-white rounded" onClick={this.onRemove}>Delete</button>
            </li>
        )
    }
}

export default TodoItem
