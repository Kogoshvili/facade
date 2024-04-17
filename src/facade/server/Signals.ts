export interface ISignal<T> {
    (v?: T | (() => T)): T;
    value: T
    _subscribers: Record<string, any> []
    set(v: any): boolean
    get(): any
    subscribe(fn: any, context: any): void
    unsubscribe(fn: any, context: any): void
    notify(): void
}

class Signal {
    value: any
    _subscribers: Record<string, any> []

    constructor(input: any) {
        this.value = input
        this._subscribers = []
    }

    set(v: any) {
        this.value = v
    }

    get() {
        return typeof this.value === 'function'
            ? this.value()
            : this.value
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
        ref.set(args[0])
        ref.notify()
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
