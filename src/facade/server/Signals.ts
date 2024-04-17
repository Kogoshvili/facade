export interface ISignal<T> {
    (v?: T | (() => T)): T;
    _value: T
    _subscribers: Record<string, any> []
    set(v: any): boolean
    get(): any
    subscribe(fn: any, context: any): void
    unsubscribe(fn: any, context: any): void
    notify(): void
}

class Signal {
    _value: any
    _subscribers: Record<string, any> []
    options: any = {
        comparer: (a: any, b: any) => a === b
    }

    constructor(input: any, options?: any) {
        this._value = input
        this._subscribers = []
        this.options = { ...this.options, ...options }
    }

    set(v: any) {
        if (this.options.comparer(this._value, v)) {
            return false
        }

        this._value = v
        return true
    }

    get() {
        return typeof this._value === 'function'
            ? this._value()
            : this._value
    }

    subscribe(fn: any) {
        this._subscribers.push(fn)
    }

    unsubscribe(fn: any) {
        this._subscribers = this._subscribers
            .filter((subscriber: any) => subscriber !== fn)
    }

    notify() {
        this._subscribers.forEach((fn: any) => fn())
    }
}


function signal(input: any) {
    const ref = new Signal(input)

    const callback = (...args: any) => { // nothing, new value, function
        // console.log('Accessed', dis.value, args.length)
        if (args.length === 0) return ref.get()
        const isSuccessful = ref.set(args[0])
        if (isSuccessful) ref.notify()
    }

    return new Proxy(callback, {
        get: (_target: any, p: string | symbol, _receiver: any): any => {
            return (ref as any)[p]
        },
    })
}


function effect(fn: (v?: any) => void, deps: any[]) {
    fn()

    deps.forEach((dep) => dep.subscribe(fn))

    return {
        invoke: fn,
        deps,
        destroy: () => deps.forEach((dep) => dep.unsubscribe(fn))
    }
}



export { signal, effect }
