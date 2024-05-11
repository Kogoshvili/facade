export interface IContext {
    name?: string
    id?: string
    instance?: any
    declaration?: any
    index: number
}

let currentContext: IContext | null = null

export function getCurrentContext() {
    return currentContext
}

function setContext(
    {name, id, instance, declaration}:
        { name?: string, id?: string, declaration?: any, instance?: any }
) {
    currentContext = {
        name,
        id,
        instance,
        declaration,
        index: 0
    }
}

function clearContext() {
    currentContext = null
}

export async function callWithContextAsync(
    f: any,
    { name, id, declaration, instance }:
        { name?: string, id?: string, declaration?: any, instance?: any }
) {
    setContext({ name, id, declaration, instance })
    const result = await f()
    clearContext()
    return result
}

export function callWithContext(
    f: any,
    { name, id, declaration, instance }:
        { name?: string, id?: string, declaration?: any, instance?: any }
) {
    setContext({ name, id, declaration, instance })
    const result = f()
    clearContext()
    return result
}
