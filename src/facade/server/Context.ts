let currentContext: {
    name?: string,
    instance?: any,
    declaration?: any,
    index: number
} | null = null

export function getCurrentContext() {
    return currentContext
}

function setContext(name?: string, declaration: any = null, instance: any = null) {
    currentContext = {
        name,
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
    name?: string, declaration?: any, instance?: any,
) {
    setContext(name, declaration, instance)
    const result = await f()
    clearContext()
    return result
}

export function callWithContext(
    f: any,
    name?: string, declaration?: any, instance?: any
) {
    setContext(name, declaration, instance)
    const result = f()
    clearContext()
    return result
}
