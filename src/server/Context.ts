export interface IContext {
    name: string
    id?: string | null
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
    { name: string, id?: string | null, declaration?: any, instance?: any }
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

export async function callWithContextAsync<T>(
    f: any,
    { name, id, declaration, instance }:
    { name: string, id?: string | null, declaration?: any, instance?: any }
): Promise<T> {
    setContext({ name, id, declaration, instance })
    const result = await f()
    clearContext()
    return result
}

export function callWithContext<T>(
    f: any,
    { name, id, declaration, instance }:
    { name: string, id?: string | null, declaration?: any, instance?: any }
): T {
    setContext({ name, id, declaration, instance })
    const result = f()
    clearContext()
    return result
}
