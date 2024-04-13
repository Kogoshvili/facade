class TodoList {
    todos = []

    constructor() {
        this.todos = []
    }

    init() {
        this.todos = ['todo1', 'todo2', 'todo3']
    }
}

function Component(target) {
    return new Proxy(target, {
        construct(target, args) {
            const instance = new target(...args)

            return new Proxy(instance, {
                set(target, property, value, receiver) {
                    const result = Reflect.set(target, property, value, receiver)
                    console.log(`Property "${property}" changed to "${value}"`)
                    return result
                }
            })
        }
    })
}

const WrappedClass = Component(TodoList)

const obj = new WrappedClass()

obj.init()
