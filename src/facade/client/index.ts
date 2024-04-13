import { DiffDOM } from 'diff-dom'
import Facade from './facade'
import { debounce } from 'lodash-es'
import { bind } from 'bind-event-listener'

declare global {
    // eslint-disable-next-line no-var
    var facade: Facade
}

if (!window.facade) {
    window.facade = {} as Facade
}

facade.config = facade.config || {
    protocol: 'ws', // http or ws
    persistence: false,
    url: 'http://localhost:3000/facade/http'
}

facade.state = facade.state || {}

facade.event = function (e: any, path: string, event?: string, mode?: string) {
    const [componentName, componentId, property] = path.split('.')
    const parameters = mode === 'bind' ? e.target.value : { value: e.target.value }

    if (facade.config.protocol === 'http') {
        this.methods.handleUpdateHttp(componentName, componentId, property, parameters)
    } else {
        this.socket.send(JSON.stringify({ componentName, componentId, property, parameters, event, mode }))
    }
}

facade.init = function () {
    this.methods.syncState()

    this.socket = new WebSocket('ws://localhost:3000/facade/ws')
    this.socket.onopen = () => {
        console.log('Facade Connected')
    }
    this.socket.onmessage = (event: any) => {
        const { dom, state } = JSON.parse(event.data)
        if (!dom || !state) return
        this.methods.updateDOM(dom)
        this.methods.updateState(state)
    }
}

facade.mount = function () {
    this.methods.attachEvents()
}

facade.rendered = function () {
    this.methods.removeEvents()
    this.methods.attachEvents()
}

let eventListeners: (() => void)[] = []

facade.methods = {
    removeEvents() {
        eventListeners.forEach((remove) => remove())
        eventListeners = []
    },
    attachEvents() {
        const elements = document.querySelectorAll('[data-facade-event]')

        elements.forEach((element) => {
            const [event, mode, ...path] = element.getAttribute('data-facade-event')!.split('.')

            const callback = debounce(
                (e) => facade.event.call(facade, e, path.join('.'), event, mode),
                getTimeout(event, mode)
            )

            const boundEvent = bind(element, { type: event, listener: callback })
            eventListeners.push(boundEvent)
        })
    },
    syncState() {
        // check if local storage has state
        const state = localStorage.getItem('facade-state')
        const persistence = facade.config.persistence

        if (persistence && state) {
            facade.state = JSON.parse(state)
            // post request to set state with local storage state //
            fetch(`${facade.config.url}/set-state`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: state
            })
                .then(res => res.json())
                .then(({ dom, state }) => {
                    this.updateDOM(dom)
                    this.updateState(state)
                    document.body.style.visibility = 'visible'
                })
        } else {
            fetch(`${facade.config.url}/get-state`)
                .then(res => res.json())
                .then(state => {
                    facade.state = state
                    document.body.style.visibility = 'visible'
                })
        }
    },
    handleUpdateHttp(componentName: string, componentId: string, method: string, parameters: any) {
        fetch(`${facade.config.url}?component=${componentName}&id=${componentId}&method=${method}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ parameters })
        })
            .then(res => res.json())
            .then(({ dom, state }) => {
                if (!dom || !state) return
                this.updateDOM(dom)
                this.updateState(state)
            })
    },
    updateDOM(domDiff: any) {
        const dd = new DiffDOM({
            postDiffApply: function (_info) {},
            preDiffApply: function (info) {
                if (info.diff.action === 'modifyChecked' && info.diff.newValue === undefined) {
                    info.diff.newValue = info.diff.oldValue
                }
                return false
            },
        })
        dd.apply(document.body, domDiff)
        facade.rendered()
    },
    updateState(stateDiff: any) {
        const state = facade.state

        if (!Array.isArray(stateDiff)) return

        stateDiff.forEach(({ path, value, type }: any) => {
            this.updateObjectByPath(state, path, { action: type, value })
        })
    },
    updateObjectByPath(obj: any, jsonPath: string, actionObj: { action: string, value: any }) {
        const { action, value } = actionObj
        const pathParts = jsonPath.split(/[.[\]]/g).filter(part => part !== '')

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
}

function getTimeout(event: string, mode: string) {
    switch (mode) {
        case 'lazy':
            return 500
        case 'bind': {
            if (event === 'input') return 250
            return 100
        }
        case 'eager':
            return 0
        case 'default':
        default: {
            if (event === 'click') return 0
            if (event === 'input') return 500
            return 100
        }
    }
}

addEventListener('DOMContentLoaded', () => {
    if (!window.facade) return
    window.facade.mount()
})

addEventListener('beforeunload', (_event) => {
    if (!facade?.socket) return
    facade.socket.close()
    if (!facade.state) return
    if (!facade.config.persistence) return
    localStorage.setItem('facade-state', JSON.stringify(facade.state))
})

facade.init()
