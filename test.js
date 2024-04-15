function signal(value) {
    const ref = { value }

    return new Proxy(ref, {
        get: (target: any, p: string | symbol, receiver: any): any => {
            console.log(target, p, receiver)
        },
        set: (target: any, p: string | symbol, newValue: any, receiver: any): boolean => {
            console.log(target, p, newValue, receiver)
        }
    })

}

const value = signal(1)
