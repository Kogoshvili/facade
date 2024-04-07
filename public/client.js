/* global smol, smog */
const url = 'http://localhost:3000/smol'

window.smol = window.smol || {}
smol.components = smol.components || {}

smol.onClick = function (e, path) {
    const [componentName, method] = path.split('.')
    const isComponent = e.target.hasAttribute('smol')
    const component = isComponent ? e.target : e.target.closest('[smol]')
    const [, id] = component.getAttribute('smol').split('.')

    fetch(`${url}?component=${componentName}&method=${method}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(compileBody(componentName, id, { value: e.target.value}))
    })
        .then(res => res.text())
        .then(updateDOM)
}

function compileBody(componentName, id, parameters) {
    const component = smog[componentName].find(c => c.id === id)

    return {
        component: {
            [componentName]: {
                id: id,
                state: component.state,
                parents: component.parents,
            },
        },
        parameters
    }
}

function updateDOM(diffJson) {
    const dd = new exports.DiffDOM()
    dd.apply(document.body, JSON.parse(diffJson))
}
