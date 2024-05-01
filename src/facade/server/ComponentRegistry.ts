import { AComponent } from './Component'
import { callWithContext } from './Context'

const Components = new Map<string, (new () => AComponent)>()

export function registerComponent(name: string, declaration: any) {
    Components.set(name, declaration)
}

export function getComponentDeclaration(name: string): (new () => AComponent) {
    return Components.get(name)!
}

export function buildComponent(name: string) {
    const declaration = getComponentDeclaration(name)
    return callWithContext(() => new declaration(), name, declaration)
}

