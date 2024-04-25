import { AComponent } from './Component'

export interface IComponentDeclaration {
    name: string
    declaration: (new () => AComponent<any>) & AComponent<any>
}

export interface IComponentNode {
    name: string
    id: string
    key: string | number | null
    xpath: string | null
    instance: AComponent | null
    props: Record<string, any>
    properties: Record<string, any>
    methods: string[]
    needsRender: boolean
    haveRendered: boolean
    hasChildren: boolean
}
