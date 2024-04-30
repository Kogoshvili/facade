import { getCurrentContext } from './Context'

const signals: Record<string, Signal[]> = {}

class Signal {
    _value: any
    _subscribers: (() => void)[] = []

    options: any = {
        comparer: (a: any, b: any) => a === b
    }

    constructor(input: any, options?: any) {
        this._value = input
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
        this._subscribers.forEach((fn: any) => fn(this.get()))
    }
}

function signal(input: any) {
    const context = getCurrentContext()!

    if (!signals[context.name]) {
        signals[context.name] = []
    }

    context.index++

    let ref: Signal

    if (!signals[context.name][context.index]) {
        ref = signals[context.name][context.index] = new Signal(input)
    } else {
        ref = signals[context.name][context.index]
    }

    function callback(...args: any) {
        currentEffectDeps?.push(ref)
        if (args.length === 0) return ref.get()
        const isSuccessful = ref.set(args[0])
        if (isSuccessful) ref.notify()
    }

    callback.prototype.toJSON = function() {
        return {
            __type: 'signal',
            value: ref.get()
        }
    }

    return new Proxy(callback, {
        get: (target: any, p: string | symbol, _receiver: any): any => {
            if (target.prototype[p]) return target.prototype[p]
            return (ref as any)[p]        },
    })
}

let currentEffectDeps: any[] | null = null

function effect(fn: (v?: any) => void) {
    currentEffectDeps = []
    const component = getCurrentContext()

    fn()

    const deps = currentEffectDeps

    deps.forEach((dep) => {
        dep.subscribe(fn)
        dep.addDependant(component)
    })

    const result = {
        invoke: fn,
        deps,
        destroy: () => deps.forEach((dep) => dep.unsubscribe(fn))
    }

    currentEffectDeps = null

    return result
}

export { signal, effect }
