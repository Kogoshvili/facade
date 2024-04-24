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
    init: () => void
    mount: () => void
    rendered: () => void
    event: (e: any, path: string, event?: string, mode?: string) => void
    methods: {
        syncState: () => void
        handleUpdateHttp: (componentName: string, componentId: string, method: string, parameters: any, event?: string, mode?: string) => void
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
