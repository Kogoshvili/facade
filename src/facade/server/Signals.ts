export interface Signal<T> {
    value: T,
    set: (v: T) => boolean,
    get: () => T
}

function signal(input: any): Signal<any> {
    const ref = {
        value: input,
        _signal: true,
        set(v: any) {
            this.value = v
        },
        get() {
            return this.value
        }
    }

    return new Proxy(ref, {
        get: (target: any, p: string | symbol, receiver: any): any => {
            // console.log(target, p, receiver, arguments)
            return Reflect.get(target, p, receiver)
        },
        set: (target: any, p: string | symbol, newValue: any, receiver: any): boolean => {
            return Reflect.set(target, p, newValue, receiver)
        },
    })
}

export default signal
