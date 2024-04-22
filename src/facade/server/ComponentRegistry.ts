import { IComponentDeclaration } from './Interfaces'

const Components = new Map<string, IComponentDeclaration>()

export function registerComponent(name: string, declaration: any) {
    const instance = new declaration()
    const methods = Object.getOwnPropertyNames(declaration.prototype).filter((m) => m !== 'constructor')
    const properties = Object.getOwnPropertyNames(instance)

    Components.set(name, {
        name,
        declaration,
        instance,
        methods,
        properties
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
