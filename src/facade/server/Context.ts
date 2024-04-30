let currentContext: { name: string, index: number } | null = null

export function getCurrentContext() {
    return currentContext
}

function setContext(name: string) {
    currentContext = {
        name,
        index: 0
    }
}

function clearContext() {
    currentContext = null
}

export async function callWithContextAsync(name: string, f: any) {
    setContext(name)
    const result = await f()
    clearContext()
    return result
}

export function callWithContext(name: string, f: any) {
    setContext(name)
    const result = f()
    clearContext()
    return result
}
