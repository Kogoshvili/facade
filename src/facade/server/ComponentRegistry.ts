import { IComponentDeclaration } from './Interfaces'

const Components = new Map<string, IComponentDeclaration>()

let currentComponent: any = null

export function getCurrentComponent() {
    return currentComponent
}

export function registerComponent(name: string, declaration: any) {
    Components.set(name, {
        name,
        declaration
    })
}

export function registerComponents(components: Record<string, any>) {
    for (const key in components) {
        registerComponent(key, components[key])
    }
}

export function getComponent(name: string) {
    return Components.get(name)
}

export function buildComponent(name: string) {
    return callWithContext(name, () => new (Components.get(name)!.declaration)())
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
