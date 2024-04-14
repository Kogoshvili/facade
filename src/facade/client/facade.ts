interface Facade {
    state: any
    socket: WebSocket
    config: {
        protocol: string
        persistence: boolean,
        url: string
    },
    events: Record<string, string>
    init: () => void
    mount: () => void
    rendered: () => void
    event: (e: any, path: string, event?: string, mode?: string) => void
    methods: {
        attachEvent: (element: Element) => void
        syncState: () => void
        handleUpdateHttp: (componentName: string, componentId: string, method: string, parameters: any) => void
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
