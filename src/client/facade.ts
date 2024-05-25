import { DiffDOM } from 'diff-dom'
import Facade, { IUpdatedProperties } from './interfaces'
import { debounce } from 'lodash-es'
import { executeOnGraph } from '../server/ComponentGraph'
import { rerenderComponent } from '../server/JSXRenderer'
import { access } from 'fs'

declare global {
    // eslint-disable-next-line no-var
    var facade: Facade
    var FScripts: any
    var fElement: (type: any, props: any, ...children: any) => any
    var fFragment: (props: any) => any
    var loadedModules: any[]
}

window.fFragment = function fFragment(props) {
	return props.children;
}

window.fElement = function fFragment(type, props, ...children) {
    return {
        type,
        props: { ...props, children },
        key: props?.key ?? null
    }
}

if (!window.facade) {
    window.facade = {} as Facade
}

facade.config = facade.config || {
    protocol: 'ws', // http or ws
    persistence: true,
    url: `${window.location.origin}/facade`
}

facade.state = facade.state || {}
facade.events = facade.events || {
    stateLoaded: 'facade:state:loaded',
    stateUpdated: 'facade:state:updated',
    domUpdated: 'facade:dom:updated'
}

facade.requests = facade.requests || {}

function debouncedRequest(componentName: string, componentId: string, property: string, parameters: any[], event?: string, mode?: string) {
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
        const parameters = e.type === 'click' ? undefined : (mode === 'bind' ? e.target.value : { value: e.target.value })
        debouncedRequest(componentName, componentId, property, [parameters], event, mode)
    } else {
        const [successful, result] = await executeOnGraph(componentName, componentId, property, [e], mode)
        if (successful && mode !== 'defer') {
            rerenderComponent(componentName, componentId)
        }
    }
}

facade.callback = async function (path: string, parameters: any) {
    const [componentName, componentId, property, event, mode] = path.split('.')
    debouncedRequest(componentName, componentId, property, [parameters], event, mode)
}

facade.request = async function (componentName: string, componentId: string, property: string, parameters: any[], event?: string, mode?: string) {
    const page = window.location.pathname.split('/').pop()

    if (facade.config.protocol === 'http') {
        // @ts-ignore
        return await facade.methods.handleUpdateHttp(page, componentName, componentId, property, parameters, event, mode)
    } else {
        // @ts-ignore
        const request = JSON.stringify({ page, componentName, componentId, property, parameters, event, mode })

        return new Promise((resolve, _reject) => {
            if (facade.socket.readyState !== WebSocket.OPEN) {
                facade.socket.onopen = () => {
                    facade.socket.send(request)
                }
            } else {
                facade.socket.send(request)
            }

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
    // if (facade.config.persistence) {
    //     const raw = localStorage.getItem('facade-state')
    //     if (raw && raw !== '[]') {
    //         facade.state = JSON.parse(raw)
    //         dispatchEvent(new CustomEvent(facade.events.stateLoaded))
    //     }
    // }

    // this.methods.syncState()
    window.history.replaceState({
        page: window.location.pathname + window.location.search
    }, '')

    this.socket = new WebSocket(`ws://${window.location.host}/`)
    this.socket.onopen = () => {
        console.debug('Facade WS Connected')
    }

    if (window.loadedModules && window.loadedModules.length) {
        window.loadedModules.forEach((module: any) => {
            facade.loaded(module.name, module.componentName, module.componentId)
        })
    }

    addEventListener('facade:state:updated', () => {
        console.debug('Facade State Updated')
    })

    addEventListener('facade:dom:updated', () => {
        console.debug('Facade DOM Updated')
    })
}

facade.mount = function () {}

facade.scripts = new Map<string, any>()

facade.execute = function(libraryName: string, componentName: string, componentId: string, method: string, args: any = []) {
    if (!FScripts[libraryName]) return

    if (!facade.scripts.has(libraryName)) {
        facade.scripts.set(libraryName, new FScripts[libraryName]() as any)
    }

    const getState = () => {
        return facade.state.find((s: any) => s.key === (componentName + '.' + componentId)).value
    }

    const instance = facade.scripts.get(libraryName)

    const element = document.getElementById(componentName + '.' + componentId)

    const component = getState()

    const methods = component.methods.reduce((acc: any, m: any) => {
        if (m.startsWith('script'))  {
            acc[m] = FScripts[libraryName][m]
        } else {
            acc[m] = async function(...args: any) {
                return await facade.request(
                    componentName,
                    componentId,
                    m,
                    args
                )
            }
        }
        return acc
    }, {} as any)

    const signals = Object.keys(component.properties).reduce((acc: any, key: any) => {
        const p = component.properties[key]
        if (!p) return acc
        if (p.__type === 'signal' || p.__type === 'prop') {
            acc[key] = async function(...args: any) {
                if (args.length === 0) {
                    const state = getState()
                    return state.properties[key].value
                }

                return await facade.request(
                    componentName,
                    componentId,
                    key,
                    args
                )
            }
        }
        return acc
    }, {} as any)

    const remoteThis = {
        ...component.properties,
        ...signals,
        ...methods
    }

    const thisMock = new Proxy(instance, {
        // if exists in instance return it else check in component
        get: function(target, prop, receiver) {
            if (prop in target) {
                return target[prop]
            } else {
                return remoteThis[prop]
            }
        }
    })

    if (!instance[method]) return
    instance[method].call(thisMock, element, ...args)
}

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
    // syncState() {
    //     // check if local storage has state
    //     // const state = localStorage.getItem('facade-state')
    //     // const persistence = facade.config.persistence

    //     // if (persistence && state) {
    //     //     facade.state = JSON.parse(state)
    //     //     // post request to set state with local storage state //
    //     //     fetch(`${facade.config.url}/set-state`, {
    //     //         method: 'POST',
    //     //         headers: {
    //     //             'Content-Type': 'application/json'
    //     //         },
    //     //         body: state
    //     //     })
    //     //         .then(res => res.json())
    //     //         .then(({ dom, state }) => {
    //     //             this.updateDOM(dom)
    //     //             this.updateState(state)
    //     //             dispatchEvent(new CustomEvent(facade.events.stateLoaded))
    //     //             document.body.style.visibility = 'visible'
    //     //         })
    //     // } else {
    //     fetch(`${facade.config.url}/get-state`)
    //         .then(res => res.json())
    //         .then(state => {
    //             facade.state = state
    //             document.body.style.visibility = 'visible'

    //             if (facade.config.persistence) {
    //                 dispatchEvent(new CustomEvent(facade.events.stateUpdated))
    //             } else {
    //                 dispatchEvent(new CustomEvent(facade.events.stateLoaded))
    //             }
    //         })
    // },
    async handleUpdateHttp(page: string, componentName: string, componentId: string, property: string, parameters: any[], event?: string, mode?: string) {
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

facade.loaded = function (libraryName: string, componentName: string, componentId: string) {
    if (facade.state?.length > 0) {
        facade.execute(libraryName, componentName, componentId, 'script')
    }

    addEventListener('facade:state:updated', function ({ detail }: any) {
        if (!detail?.updatedProperties) return
        if (detail.updatedProperties?.some((i: any) => i.componentName === componentName && i.componentId === componentId)) {
            facade.execute(libraryName, componentName, componentId, 'scriptOnState')
        }
    })
}

facade.link = async function (href: string, popState = false) {
    console.log('Linking to', href)
    const pageURL = href === '/' ? '/index' : href

    const responseRaw = await fetch(`${facade.config.url}/page/${pageURL.startsWith('/') ? pageURL.slice(1) : pageURL}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
    })

    const { diffs, state } = await responseRaw.json()
    const { head, body } = diffs

    const dd = new DiffDOM()
    dd.apply(document.head, head)
    dd.apply(document.body, body)
    facade.methods.updateState(state)

    if (!popState) {
        console.log('Pushing state', pageURL)
        window.history.pushState({
            page: pageURL
        }, '', href)
    }
}

facade.init()
mountEvents()

function mountEvents() {
    addEventListener('DOMContentLoaded', () => {
        if (!window.facade) return
        window.facade.mount()
    })

    addEventListener('popstate', (event) => {
        if (window.facade && event.state?.page) {
            console.log('Poping to', event.state.page)
            window.facade.link(event.state.page, true)
        }
    })

    addEventListener('beforeunload', (_event) => {
        if (!facade?.socket) return
        window.facade.socket.close()
    })

    addEventListener('facade:state:updated', ({ detail }: any) => {
        if (!detail?.updatedProperties) return
        detail.updatedProperties.forEach(
            ({ componentName, componentId, property, newValue }: IUpdatedProperties) => {
                const search = `[oninput="facade.event(event, '${componentName}.${componentId}.${property}.input.bind')"]`
                const element = document.querySelector(search)
                if (!element) return
                if (newValue === undefined) return
                // @ts-ignore
                element.value = newValue
            })
    })

    addEventListener('facade:state:updated', () => {
        localStorage.setItem('facade-state', JSON.stringify(facade.state))
    })
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
