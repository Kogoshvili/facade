import { Component, AComponent } from 'facade/server'

class TodoItem extends AComponent<any, AComponent> {
    todo: any
    isCompleted: boolean = false
    isClicked: boolean = false

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

    test() {
        // this.parent()!.test()
        // console.log('Test Method TodoItem', this.todo.id, this.isCompleted)
    }

    static render(this: TodoItem) {
        return (
            <li class="flex justify-between items-center bg-gray-100 p-2 rounded-md mb-2" style={{ backgroundColor: this.isClicked ? 'red' : undefined }}>
                <input type="checkbox" class="form-checkbox h-5 w-5 text-blue-600" onChange={this.handleChange} checked={this.isCompleted} />
                <div class="text-gray-700" onClick={() => this.isClicked = !this.isClicked}>{this.todo.title} {this.isClicked ? 'Clicked' : 'Not Clicked'}</div>
                <button class="px-2 py-1 bg-red-500 text-white rounded" onClick={this.onRemove}>Delete</button>
            </li>
        )
    }
}

export default TodoItem
