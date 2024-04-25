import { AComponent } from 'facade/server'

class TodoItem extends AComponent<any, AComponent> {
    todo: any
    isCompleted: boolean = false

    recived(props: any): void {
        this.todo = props.todo
        this.isCompleted = this.todo.completed
    }

    onRemove() {
        this.parent()!.handleRemove(this.todo.id)
    }

    handleChange() {
        this.isCompleted = !this.isCompleted
    }

    callbackTest() {
        // this.parent()!.callback()
        console.log('Server side')
        return 123
    }

    // static async client(this: TodoItem) {
    //     const res = await this.callbackTest()
    //     console.log('Result', res)
    //     console.log('Client side', this._id, this._name, this._key, this.todo.title)
    // }

    static render(this: TodoItem) {
        return (
            <li class="flex justify-between items-center bg-gray-100 p-2 rounded-md mb-2" style={{ backgroundColor: this.isCompleted ? 'aqua' : undefined }}>
                <input type="checkbox" class="form-checkbox h-5 w-5 text-blue-600 cursor-pointer" onChange={this.handleChange} checked={this.isCompleted} />
                <div class="text-gray-700">{this.todo.title}</div>
                <button class="px-2 py-1 bg-red-500 text-white rounded" onClick={this.onRemove}>Delete</button>
            </li>
        )
    }
}

export default TodoItem
