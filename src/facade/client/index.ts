import { DiffDOM } from 'diff-dom'
import Facade, { IUpdatedProperties } from './interfaces'
import debounce from 'lodash/debounce'
import { executeOnGraph } from '../server/ComponentGraph'
import { rerenderComponent } from '../server/JSXRenderer'
import { renderer } from '../server/JSXRenderer'

window.fFragment = function fFragment(props) {
	return props.children;
}

window.fElement = function fFragment(type, props, ...children) {
    return {
        type,
        props: { ...props, children },
    }
}

const components: any = {}

export function registerComponents(componentsToRegister: any) {
    for (const key in componentsToRegister) {
        components[key] = componentsToRegister[key]
    }
}

export function initialize() {
    mountComponents()
    addEventListener('DOMContentLoaded', mountComponents)

    function mountComponents() {
        for (const key in components) {
            const elements = document.querySelectorAll(`[data-component="${key}"]`)
            elements.forEach(async (element) => {
                const xpath = element.getAttribute('data-xpath') || ''

                const rawProps = element.getAttribute('data-props') || '{}'
                const props = JSON.parse(rawProps)
                const component = components[key]
                element.outerHTML = await renderer(fElement(component, props), null, xpath)
            })
        }
    }

    console.log('Client side facade')
}

export function getState() {
    return facade.state
}

export async function setState(newState: any) {
    return await facade.methods.pushState(newState)
}


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
    url: `${window.location.origin}/facade/http`
}

facade.state = facade.state || {}
facade.events = facade.events || {
    stateUpdated: 'facade:state:updated',
    domUpdated: 'facade:dom:updated'
}

facade.requests = facade.requests || {}

function debouncedRequest(componentName: string, componentId: string, property: string, parameters: any, event?: string, mode?: string) {
    const timeout = getTimeout(mode, event)
    const key = `${componentName}.${componentId}.${property}.${event}.${mode}`

    if (!facade.requests[key]) {
        facade.requests[key] = debounce(facade.request, timeout)
    }

    facade.requests[key](componentName, componentId, property, parameters, event, mode)
}

facade.event = async function (e: any, path: string, isClient = false) {
    const [componentName, componentId, property, event, mode] = path.split('.')

    if (!isClient) {
        const parameters = mode === 'bind' ? e.target.value : { value: e.target.value }
        debouncedRequest(componentName, componentId, property, parameters, event, mode)
    } else {
        const [successful, result] = await executeOnGraph(componentName, componentId, property, e, mode)
        if (successful && mode !== 'defer') {
            rerenderComponent(componentName, componentId)
        }
    }
}

facade.callback = async function (path: string, parameters: any) {
    const [componentName, componentId, property, event, mode] = path.split('.')
    debouncedRequest(componentName, componentId, property, parameters, event, mode)
}

facade.request = async function (componentName: string, componentId: string, property: string, parameters: any, event?: string, mode?: string) {
    const page = window.location.pathname.split('/').pop()

    if (facade.config.protocol === 'http') {
        // @ts-ignore
        return await facade.methods.handleUpdateHttp(page, componentName, componentId, property, parameters, event, mode)
    } else {
        // @ts-ignore
        const request = JSON.stringify({ page, componentName, componentId, property, parameters, event, mode })

        return new Promise((resolve, _reject) => {
            facade.socket.send(request)
            facade.socket.onmessage = (event: any) => {
                const { dom, diffs, state, result } = JSON.parse(event.data)

                if (diffs) {
                    diffs.forEach((diff: any) => {
                        facade.methods.updateElement(diff)
                    })
                } else if (dom) {
                    facade.methods.updateDOM(dom)
                }

                if (state) facade.methods.updateState(state)
                if (result) resolve(result)
                resolve()
            }
        })
    }
}

facade.init = function () {
    this.methods.syncState()

    this.socket = new WebSocket(`ws://${window.location.host}/`)
    this.socket.onopen = () => {
        console.log('Facade Connected')
    }

    addEventListener('facade:state:updated', () => {
        console.log('State Updated')
    })

    addEventListener('facade:dom:updated', () => {
        console.log('DOM Updated')
    })
}

facade.mount = function () {}

facade.methods = {
    async pushState(newState: any) {
        facade.state = { ...facade.state, ...newState }

        const response = await fetch(`${facade.config.url}/set-state`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: facade.state
        })

        const { dom, state } = await response.json()

        this.updateDOM(dom)
        this.updateState(state)
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
                    const event = new CustomEvent(facade.events.stateUpdated, {
                        detail: {
                            updatedProperties: null
                        },
                    })
                    dispatchEvent(event)
                })
        }
    },
    async handleUpdateHttp(page: string, componentName: string, componentId: string, property: string, parameters: any, event?: string, mode?: string) {
        const responseRaw = await fetch(`${facade.config.url}?page=${page}&component=${componentName}&id=${componentId}&property=${property}&event=${event}&mode=${mode}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ parameters })
        })

        const response = await responseRaw.json()
        const { dom, state, result } = response

        if (dom) this.updateDOM(dom)
        if (state) this.updateState(state)

        return result
    },
    updateElement({ id, name, diff }: any) {
        const dd = new DiffDOM({
            preDiffApply: function (info) {
                if (info.diff.action === 'modifyChecked' && info.diff.newValue === undefined) {
                    info.diff.newValue = info.diff.oldValue
                }
                return false
            },
        })
        const prevBody = document.getElementById(`${name}.${id}`)!
        dd.apply(prevBody, diff)
        dispatchEvent(new CustomEvent(facade.events.domUpdated))
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
                const propertyIndex = parts.findIndex((part: string) => part === 'properties') + 1
                const index = parts[1].match(/\d+/g)

                updatedProperties.push({
                    componentName: state[index].value.name,
                    componentId: state[index].value.id,
                    property: parts[propertyIndex],
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
            if (part === '$' || part === '$root') continue
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

function getTimeout(mode?: string, event?: string) {
    // defer => sync on next request
    // lazy => 500ms
    // bind => two way bind 100ms
    // eager => 0ms
    switch (mode) {
        case 'lazy':
            return 500
        case 'bind': {
            if (event === 'input') return 250
            return 100
        }
        case 'eager':
            return 0
        case 'defer':
        case 'default':
        default: {
            if (event === 'click') return 0
            if (event === 'input') return 250
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
    if (!updatedProperties) return
    updatedProperties.forEach(
        ({ componentName, componentId, property, newValue }: IUpdatedProperties) => {
            const search = `[oninput="facade.event(event, '${componentName}.${componentId}.${property}.input.bind')"]`
            const element = document.querySelector(search)
            if (!element) return
            if (newValue === undefined) return
            // @ts-ignore
            element.value = newValue
        })
})

facade.init()
