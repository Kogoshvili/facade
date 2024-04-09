const instanceTree = {
    TodoList: [
        {
            id: 'Ru2NaxY_V5',
            name: 'TodoList',
            instance: null,
            properties: {
                todos: [
                    'pear',
                    'kiwi',
                    'strawberry',
                ],
                _parent: null,
                _id: 'Ru2NaxY_V5',
                _name: 'TodoList',
            },
            parent: null,
            state: 0,
        },
    ],
    TodoItem: [
        {
            id: 'Nc0k6SFzkC',
            name: 'TodoItem',
            instance: null,
            properties: {
                todo: 'pear',
                _parent: {
                    todos: [
                        'pear',
                        'kiwi',
                        'strawberry',
                    ],
                    _parent: null,
                    _id: 'Ru2NaxY_V5',
                    _name: 'TodoList',
                },
                _id: 'Nc0k6SFzkC',
                _name: 'TodoItem',
            },
            parent: {
                name: 'TodoList',
                id: 'Ru2NaxY_V5',
            },
            state: 0,
        },
        {
            id: 'rG-Hglv0P3',
            name: 'TodoItem',
            instance: null,
            properties: {
                todo: 'kiwi',
                _parent: {
                    todos: [
                        'pear',
                        'kiwi',
                        'strawberry',
                    ],
                    _parent: null,
                    _id: 'Ru2NaxY_V5',
                    _name: 'TodoList',
                },
                _id: 'rG-Hglv0P3',
                _name: 'TodoItem',
            },
            parent: {
                name: 'TodoList',
                id: 'Ru2NaxY_V5',
            },
            state: 0,
        },
        {
            id: '5NUB-o8yZw',
            name: 'TodoItem',
            instance: null,
            properties: {
                todo: 'strawberry',
                _parent: {
                    todos: [
                        'pear',
                        'kiwi',
                        'strawberry',
                    ],
                    _parent: null,
                    _id: 'Ru2NaxY_V5',
                    _name: 'TodoList',
                },
                _id: '5NUB-o8yZw',
                _name: 'TodoItem',
            },
            parent: {
                name: 'TodoList',
                id: 'Ru2NaxY_V5',
            },
            state: 0,
        },
    ],
}

function makeComponent(componentName) {
    return {/* ... */}
}

const components = {}

function recreateInstances() {
    function resolveInstance(instance) {
        if (instance.parent !== null) {
            // find the parent instance
            const parentInstance = instanceTree[instance.parent.name].find(parent => parent.id === instance.parent.id)
            // check if the parent instance exists
            if (parentInstance) {
                // check if the parent instance has an instance
                if (parentInstance.instance === null) {
                    resolveInstance(parentInstance)
                } else {
                    instance.instance = makeComponent(components[instance.name], {
                        parent: parentInstance.instance,
                        id: instance.id,
                        name: instance.name,
                    })
                }
            }
        } else {
            instance.instance = makeComponent(components[instance.name], {
                parent: null,
                id: instance.id,
                name: instance.name,
            })
        }
    }

    // loop through the keys of the tree
    for (let component in instanceTree) {
        // loop through the instances of the key
        for (let instance of instanceTree[component]) {
            resolveInstance(instance)
        }
    }
}

recreateInstances(instanceTree)
