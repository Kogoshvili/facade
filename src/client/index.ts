import { DiffDOM } from 'diff-dom'

declare global {
    interface Window {
        smol: any;
    }
}

window.smol = window.smol || {}
window.smol.config = window.smol.config || {
    protocol: 'http', // http or ws
}

const url = 'http://localhost:3000/smol/http'

if (!window.smol?.state) {
    fetch(`${url}/sync-state`)
        .then(res => res.json())
        .then(state => {
            window.smol.state = state
        })
}

const socket = new WebSocket('ws://localhost:3000/smol/ws')

socket.onopen = function () {
    console.log('connected')
}

socket.onmessage = function (event) {
    const { dom, state } = JSON.parse(event.data)
    updateDOM(dom)
    updateState(state)
}

window.smol.onClick = function (e: any, path: string) {
    const [componentName, componentId, method] = path.split('.')
    const parameters = { value: e.target.value }

    if (window.smol.config.protocol === 'http') {
        handleUpdateHttp(componentName, componentId, method, parameters)
    } else {
        socket.send(JSON.stringify({ componentName, componentId, method, parameters }))
    }
}

function handleUpdateHttp(componentName: string, componentId: string, method: string, parameters: any) {
    fetch(`${url}?component=${componentName}&id=${componentId}&method=${method}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parameters })
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

    if (!Array.isArray(stateDiff)) return

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
