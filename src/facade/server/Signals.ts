export interface ISignal<T> {
    (v?: T | (() => T)): void;
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
        return true
    }

    get() {
        return typeof this.value === 'function'
            ? this.value()
            : this.value
    }

    subscribe(fn: any, { name = null }: any = {}) {
        this._subscribers[name] = this._subscribers[name] || []
        this._subscribers[name].push(fn)
    }

    unsubscribe(fn: any, { name = null }: any = {}) {
        this._subscribers[name] = this._subscribers[name] || []
        this._subscribers[name] = this._subscribers[name]
            .filter((subscriber: any) => subscriber !== fn)
    }

    notify() {
        Object.keys(this._subscribers)
            .forEach((context: string) => {
                this._subscribers[context as any]
                    .forEach((fn: any) => fn())
            })
    }
}


function signal(input: any) {
    const ref = new Signal(input)

    const callback = (...args: any) => { // nothing, new value, function
        // console.log('Accessed', dis.value, args.length)
        if (args.length === 0) return ref.get()

        const isSuccessful = ref.set(args[0])

        if (isSuccessful) ref.notify()

        return isSuccessful
    }

    return new Proxy(callback, {
        get: (_target: any, p: string | symbol, _receiver: any): any => {
            return (ref as any)[p]
        },
    })
}


function effect(fn: () => void, deps: any[]) {
    fn()

    deps.forEach((dep) => dep.subscribe(fn))

    return {
        deps,
        destroy: () => deps.forEach((dep) => dep.unsubscribe(fn))
    }
}



export { signal, effect }
