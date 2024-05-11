import FComponent from '../components/Component'
import { callWithContext } from './Context'

const Components = new Map<string, (new () => FComponent)>()

export function registerComponent(name: string, declaration: any) {
    Components.set(name, declaration)
}

export function getComponentDeclaration(name: string): (new () => FComponent) {
    return Components.get(name)!
}

export function buildComponent(name: string, id: string) {
    const declaration = getComponentDeclaration(name)
    return callWithContext(() => new declaration(), { name, declaration, id })
}
