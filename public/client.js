/* global smol, smog, buildDOMTree */
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
    const dd = new exports.DiffDOM({
        postDiffApply: function ({ diff, node }) {
            if (node.nodeType !== Node.ELEMENT_NODE) return

            if (diff.action === 'removeElement') {
                const smolAttr = node.getAttribute('smol')
                if (!smolAttr) return
                const [key, id] = smolAttr.split('.')
                smog[key] = smog[key].filter(c => c.id !== id)
            }

            if (diff.action === 'modifyAttribute') {
                const smolAttr = node.getAttribute('smol')
                if (!smolAttr) return
                const [key, id] = smolAttr.split('.')
                const state = JSON.parse(node.getAttribute('smol-state'))
                const component = smog[key].find(c => c.id === id)
                if (component) component.state = state
                else buildDOMTree(node)
            }
        },
    })
    dd.apply(document.body, JSON.parse(diffJson))
}
