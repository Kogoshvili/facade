import { DiffDOM } from 'diff-dom'

declare global {
    interface Window {
        smol: any;
    }
}

const url = 'http://localhost:3000/smol'

if (!window.smol?.state) {
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
        body: JSON.stringify({ parameters: { value: e.target.value } })
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
        updateObjectByPath(state, path, { action: type, value })
    })
}

function updateObjectByPath(obj: any, jsonPath: string, actionObj: { action: string, value: any }) {
    const { action, value } = actionObj
    const pathParts = jsonPath.split(/[.\[\]]/g).filter(part => part !== '')

    let currentObj = obj
    const lastIndex = pathParts.length - 1

    for (let i = 0; i < lastIndex; i++) {
        const part = pathParts[i]
        if (part === '$') continue
        if (!(part in currentObj)) {
            throw new Error(`Invalid JSONPath: ${jsonPath}`)
        }
        currentObj = currentObj[part]
    }

    const lastPart = pathParts[lastIndex]

    if (action === 'UPDATE' || action === 'ADD') {
        currentObj[lastPart] = value
    } else if (action === 'REMOVE') {
        if (Array.isArray(currentObj)) {
            currentObj.splice(Number(lastPart), 1)
        } else {
            delete currentObj[lastPart]
        }
    } else {
        throw new Error(`Invalid action: ${action}`)
    }

    return obj
}
