import { isString } from 'lodash-es'
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

const anonymousMethods = new Map<string, string[]>()

export function registerAnonymousMethod(name: string, method: any): number {
    if (!anonymousMethods.has(name)) {
        anonymousMethods.set(name, [])
    }

    const stringified = isString(method) ? method : method.toString()
    const methods = anonymousMethods.get(name)!
    const index = methods.findIndex(m => m === stringified)

    if (index !== -1) return index

    methods.push(stringified)
    return methods.length - 1
}

export function getAnonymousMethods(name: string): string[] {
    return anonymousMethods.get(name) || []
}

export function getAnonymousMethod(name: string, index: number): string {
    const methods = anonymousMethods.get(name)

    if (!methods || !methods[index]) {
        throw new Error(`Anonymous function not found for ${name}`)
    }

    return methods[index]
}
