import { DiffDOM } from 'diff-dom'

declare global {
    interface Window {
        facade: any;
    }
}

window.facade = window.facade || {}
window.facade.config = window.facade.config || {
    protocol: 'http', // http or ws
    persistence: true
}

addEventListener('beforeunload', (event) => {
    socket.close()
    localStorage.setItem('facade-state', JSON.stringify(window.facade.state))
})

const url = 'http://localhost:3000/facade/http'

if (!window.facade?.state) {
    // check if local storage has state
    const state = localStorage.getItem('facade-state')
    const persistence = window.facade.config.persistence

    if (persistence && state) {
        window.facade.state = JSON.parse(state)
        // post request to set state with local storage state
        fetch(`${url}/set-state`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: state
        })
            .then(res => res.json())
            .then(({ dom, state }) => {
                updateDOM(dom)
                updateState(state)
                document.body.style.visibility = 'visible'
            })
    } else {
        fetch(`${url}/get-state`)
            .then(res => res.json())
            .then(state => {
                window.facade.state = state
                document.body.style.visibility = 'visible'
            })
    }

}

const socket = new WebSocket('ws://localhost:3000/facade/ws')

socket.onopen = function () {
    console.log('connected')
}

socket.onmessage = function (event) {
    const { dom, state } = JSON.parse(event.data)
    updateDOM(dom)
    updateState(state)
}

window.facade.onClick = function (e: any, path: string) {
    const [componentName, componentId, method] = path.split('.')
    const parameters = { value: e.target.value }

    if (window.facade.config.protocol === 'http') {
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
    const state = window.facade.state

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
