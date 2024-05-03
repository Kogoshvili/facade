import { markToRender } from './ComponentGraph'
import { getCurrentContext } from './Context'
import { rerenderComponent } from './JSXRenderer'

const signals: Record<string, Signal[]> = {}

class Signal {
    _value: any
    _subscribers: (() => void)[] = []
    _owner: any | null = null

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
        if (this._owner && this._owner.instance) {
            // markToRender(this._owner.instance.name, this._owner.instance.id)
            rerenderComponent(this._owner.instance._name, this._owner.instance._id)
        }
        this._subscribers.forEach((fn: any) => fn(this.get()))
    }
}

function signal(input: any) {
    const context = getCurrentContext()!
    context.index++

    let ref: Signal = new Signal(input)

    function callback(...args: any) {
        const context = getCurrentContext()

        if (context && !ref._owner) {
            ref._owner = context
        }

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
