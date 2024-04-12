interface Facade {
    state: any
    socket: WebSocket
    config: {
        protocol: string
        persistence: boolean,
        url: string
    }
    init: () => void
    mount: () => void
    rendered: () => void
    onClick: (e: any, path: string, event?: string, mode?: string) => void
    methods: {
        removeEvents: () => void
        attachEvents: () => void
        syncState: () => void
        handleUpdateHttp: (componentName: string, componentId: string, method: string, parameters: any) => void
        updateDOM: (domDiff: any) => void
        updateState: (stateDiff: any) => void
        updateObjectByPath: (obj: any, jsonPath: string, actionObj: { action: string, value: any }) => any
    }
}

export default Facade
