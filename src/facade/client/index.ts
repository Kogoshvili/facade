import { DiffDOM } from 'diff-dom'
import Facade, { IUpdatedProperties } from './facade'
import debounce from 'lodash/debounce'

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
facade.events = facade.events || {
    stateUpdated: 'facade:state:updated',
    domUpdated: 'facade:dom:updated'
}

facade.event = function (e: any, path: string, event?: string, mode?: string) {
    const [componentName, componentId, property] = path.split('.')
    const parameters = mode === 'bind' ? e.target.value : { value: e.target.value }

    if (facade.config.protocol === 'http') {
        this.methods.handleUpdateHttp(componentName, componentId, property, parameters)
    } else {
        this.socket.send(JSON.stringify({ componentName, componentId, property, parameters, event, mode }))
    }
}

const attachedEvents: any = []

facade.init = function () {
    this.methods.syncState()

    this.socket = new WebSocket('ws://localhost:3000/facade/ws')
    this.socket.onopen = () => {
        console.log('Facade Connected')
    }
    this.socket.onmessage = (event: any) => {
        const { dom, state } = JSON.parse(event.data)
        if (dom) this.methods.updateDOM(dom)
        if (state) this.methods.updateState(state)
    }

    addEventListener('facade:state:updated', () => {
        console.log('State Updated')
    })

    addEventListener('facade:dom:updated', () => {
        console.log('DOM Updated')
        attachedEvents.forEach((removeListener: any) => removeListener())
        this.mount()
    })
}

facade.mount = function () {
    const elements = document.querySelectorAll('[data-facade-event]')
    elements.forEach(this.methods.attachEvent)
}

facade.methods = {
    attachEvent(element: Element) {
        const facadeEventValue = element.getAttribute('data-facade-event')
        const [event, mode, componentName, componentId, property] = facadeEventValue!.split('.')

        const callback = debounce(
            (e) => facade.event.call(facade, e, [componentName, componentId, property].join('.'), event, mode),
            getTimeout(event, mode)
        )

        const eventListener = (element: any) => {
            element.addEventListener(event, callback)
            return () => element.removeEventListener(event, callback)
        }

        attachedEvents.push(eventListener(element))
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
                if (dom) this.updateDOM(dom)
                if (state) this.updateState(state)
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

        dispatchEvent(new CustomEvent(facade.events.domUpdated))
    },
    updateState(stateDiff: any) {
        const state = facade.state

        if (!Array.isArray(stateDiff)) return
        const updatedProperties: IUpdatedProperties[] = []

        stateDiff.forEach(({ path, value, type }: any) => {
            this.updateObjectByPath(state, path, { action: type, value })

            if (path.includes('properties')) {
                const parts = path.split('.')

                // Remove the $ from the first part
                const nameAndIndex = parts[1].split('[')

                const componentName = nameAndIndex[0] // "TodoList"
                const index = parseInt(nameAndIndex[1]) // 0

                updatedProperties.push({
                    componentName,
                    componentId: state[componentName][index].id,
                    property: parts[3],
                    newValue: value
                })
            }
        })

        const event = new CustomEvent(facade.events.stateUpdated, {
            detail: {
                updatedProperties
            },
        })

        dispatchEvent(event)
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
                currentObj[part] = {}
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

addEventListener('facade:state:updated', ({
    detail: { updatedProperties }
}: any) => {
    updatedProperties.forEach(
        ({ componentName, componentId, property, newValue }: IUpdatedProperties) => {
            const search = `[data-facade-event="input.bind.${componentName}.${componentId}.${property}"]`
            const element = document.querySelector(search)
            if (!element) return
            if (newValue === undefined) return
            // @ts-ignore
            element.value = newValue
        })
})

facade.init()
