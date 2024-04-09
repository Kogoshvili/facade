import { DiffDOM } from 'diff-dom'
import jsonpath from 'jsonpath'

declare global {
    interface Window {
        smol: any;
    }
}

const url = 'http://localhost:3000/smol'

if (!window.smol?.state) {
    // get request to /state
    fetch('http://localhost:3000/sync-state')
        .then(res => res.json())
        .then(state => {
            window.smol.state = state
        })
}

window.smol = window.smol || {}

window.smol.onClick = function (e: any, path: string) {
    const [componentName, componentId, method] = path.split('.')

    fetch(`${url}?component=${componentName}&id=${componentId}&method=${method}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parameters: { value: e.target.value} })
    })
        .then(res => res.json())
        .then(({ dom, state }) => {
            updateDOM(dom)
            updateState(state)
        })
}

function updateDOM(domDiff: any) {
    const dd = new DiffDOM()
    dd.apply(document.body, domDiff)
}

function updateState(stateDiff: any) {
    const state = window.smol.state

    stateDiff.forEach(({ path, value, type }: any) => {
        if (type === 'UPDATE') {
            jsonpath.apply(state, path, function(_e: any) { return value })
        }

        if (type === 'REMOVE') {
            const pathArray = path.split('.')
            const lastItemIsArray = pathArray[pathArray.length - 1].includes('[')
            const index = lastItemIsArray ? parseInt(pathArray[pathArray.length - 1].split('[')[1].split(']')[0]) : null
            const parent = jsonpath.parent(state, path)

            if (index !== null) {
                parent.splice(index, 1)
            } else {
                delete parent[pathArray[pathArray.length - 1]]
            }
        }
    })
}
