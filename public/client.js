/* global smol */
const url = 'http://localhost:3000/smol'

window.smol = window.smol || {}
smol.components = smol.components || {}

smol.onClick = function(e, path) {
    const [componentName, method] = path.split('.')
    const isComponent = e.target.hasAttribute('smol')
    const component = isComponent ? e.target : e.target.closest('[smol]')
    const componentId = component.getAttribute('smol').split('.')[1]

    registerComponent(component)

    fetch(`${url}?component=${componentName}&method=${method}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(compileBody(componentName, componentId))
    })
        .then(res => res.text())
        .then(html => {
            const newDom = exports.stringToObj(html)
            updateDOM(component, newDom)
            updateState(componentName, newDom.attributes)
        })
}

function compileBody(componentName, id) {
    const component = smol.components[componentName].instances[id]
    const childrenState = Object.entries(component.children).reduce((acc, [childName, childIds]) => {
        const childStates = childIds.map(childId => {
            const childComponent = smol.components[childName].instances[childId]
            return {
                id: childId,
                state: childComponent.state
            }
        })

        return { ...acc, [childName]: childStates }
    }, {})

    return {
        id: id,
        state: component.state,
        children: childrenState
    }
}

function updateDOM(component, html) {
    const dd = new exports.DiffDOM()
    const diff = dd.diff(component, html)
    dd.apply(component, diff)
}

function registerComponent(component) {
    const [componentName, id] = component.getAttribute('smol').split('.')
    if (smol.components[componentName]?.instances[id]) return

    const state = JSON.parse(component.getAttribute('smol-state'))
    smol.components[componentName] = smol.components[componentName] ?? {}
    smol.components[componentName].instances = smol.components[componentName].instances ?? {}
    smol.components[componentName].instances[id] = smol.components[componentName].instances[id] ?? {}
    smol.components[componentName].instances[id].state = state
    smol.components[componentName].instances[id].children = {}
    const thisComponent = smol.components[componentName].instances[id]

    const children = component.querySelectorAll('[smol]')
    children.forEach(child => {
        const [childName, childId] = child.getAttribute('smol').split('.')

        thisComponent.children[childName] = [
            ...(thisComponent.children[childName] ?? []),
            childId
        ]

        if (smol.components[childName]?.instances[childId]) return
        registerComponent(child)
    })
}

function updateState(componentName, attributes) {
    const state = JSON.parse(attributes['smol-state'])
    const id = attributes['smol'].split('.')[1]

    smol.components[componentName].instances[id].state = state
}
