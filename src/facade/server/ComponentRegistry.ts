import { AComponent } from './Component'

const Components = new Map<string, (new () => AComponent)>()

let currentComponent: any = null

export function getCurrentComponent() {
    return currentComponent
}

export function registerComponent(name: string, declaration: any) {
    Components.set(name, declaration)
}

export function getComponentDeclaration(name: string): (new () => AComponent) {
    return Components.get(name)!
}

export function buildComponent(name: string) {
    return callWithContext(name, () => new (getComponentDeclaration(name))())
}

export async function callWithContextAsync(name: string, f: any) {
    currentComponent = name
    const result = await f()
    currentComponent = null
    return result
}

export function callWithContext(name: string, f: any) {
    currentComponent = name
    const result = f()
    currentComponent = null
    return result
}
