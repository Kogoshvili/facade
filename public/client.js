/* global smol */
const url = 'http://localhost:3000/smol'

window.smol = window.smol || {}
smol.components = smol.components || {}

smol.onClick = function (e, path) {
    const [componentName, componentId, method] = path.split('.')

    fetch(`${url}?component=${componentName}&id=${componentId}&method=${method}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parameters: { value: e.target.value} })
    })
        .then(res => res.text())
        .then(updateDOM)
}

function updateDOM(diffJson) {
    const dd = new exports.DiffDOM()
    dd.apply(document.body, JSON.parse(diffJson))
}
