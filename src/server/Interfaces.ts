import { Component } from "../components/Component"

export interface IComponentDeclaration {
    name: string
    declaration: (new () => Component<any>) & Component<any>
}

export interface IComponentNode {
    name: string
    id: string
    key: string | number | null
    xpath: string | null
    instance: Component | null
    props: Record<string, any>
    properties: Record<string, any>
    methods: string[]
    needsRender: boolean
    haveRendered: boolean
    hasChildren: boolean
}
