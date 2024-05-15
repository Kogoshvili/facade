import { toComponent, Component } from '../components/Component'
import { callWithContext } from './Context'

const Components = new Map<string, (new () => Component)>()

export function registerComponent(name: string, declaration: any) {
    Components.set(name, declaration)
}

export function getComponentDeclaration(name: string): (new () => Component) {
    if (!Components.has(name)) {
        throw new Error(`Component ${name} not found`)
    }

    return Components.get(name)!
}

export function buildComponent(name: string, id: string): Component {
    const declaration = getComponentDeclaration(name)
    const instance = callWithContext(() => new declaration(), { name, id, declaration})
    return toComponent(instance, { name, id })
}
