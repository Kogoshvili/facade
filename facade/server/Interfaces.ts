import { FComponent } from './Component'

export interface IComponentDeclaration {
    name: string
    declaration: (new () => FComponent<any>) & FComponent<any>
}

export interface IComponentNode {
    name: string
    id: string
    key: string | number | null
    xpath: string | null
    instance: FComponent | null
    props: Record<string, any>
    properties: Record<string, any>
    methods: string[]
    needsRender: boolean
    haveRendered: boolean
    hasChildren: boolean
}
