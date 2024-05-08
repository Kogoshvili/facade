interface Facade {
    state: any
    socket: WebSocket,
    requests: Record<string, any>
    config: {
        protocol: string
        persistence: boolean,
        url: string
    },
    events: Record<string, string>
    request: (componentName: string, componentId: string, property: string, parameters: any, event?: string, mode?: string) => void
    callback: (path: string, parameters: any) => void
    init: () => void
    link: (path: string) => void
    mount: () => void
    execute: (componentName: string, componentId: string, method: string, args: any) => void
    rendered: () => void
    loaded: (name: string, componentName: string, componentId: string) => void
    event: (e: any, path: string, isClient?: boolean) => void
    methods: {
        pushState: (state: any) => Promise<void>
        syncState: () => void
        handleUpdateHttp: (componentName: string, componentId: string, method: string, parameters: any, event?: string, mode?: string) => void
        updateElement: (diff: any) => void
        updateDOM: (domDiff: any) => void
        updateState: (stateDiff: any) => void
        updateObjectByPath: (obj: any, jsonPath: string, actionObj: { action: string, value: any }) => any
    }
}

export interface IUpdatedProperties {
    componentName: string,
    componentId: string,
    property: string,
    newValue: any
}

export default Facade
