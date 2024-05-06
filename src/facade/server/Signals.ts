import { makeSureInstancesExist, markToRender } from './ComponentGraph'
import { IContext, getCurrentContext } from './Context';
import { rerenderComponent } from './JSXRenderer';

const isClinet = !(typeof process === 'object')

class Signal {
    _value: any
    _subscribers: (() => void)[] = []
    _owner: null | IContext = null

    options: any = {
        comparer: (a: any, b: any) => a === b
    }

    constructor(input: any, options?: any) {
        this._value = input
        this.options = { ...this.options, ...options }
    }

    set(v: any) {
        const newValue = typeof v === 'function' ? v(this._value) : v

        if (this.options.comparer(this._value, newValue)) {
            return false
        }

        this._value = newValue
        return true
    }

    get() {
        return typeof this._value === 'function'
            ? this._value()
            : this._value
    }

    addDependant(dep: string) {
        if (this._owner?.declaration) {
            this._owner.declaration.prototype._dependants ??= new Set()
            this._owner?.declaration?.prototype._dependants.add(dep)
        }
    }

    removeDependant(dep: string) {
        if (this._owner?.declaration?.prototype._dependants) {
            this._owner?.declaration?.prototype._dependants.delete(dep)
        }
    }

    subscribe(fn: any) {
        this._subscribers.push(fn)
    }

    unsubscribe(fn: any) {
        this._subscribers = this._subscribers
            .filter((subscriber: any) => subscriber !== fn)
    }

    notify() {
        if (this._owner?.instance) {
            if (isClinet) {
                rerenderComponent(this._owner.instance._name, this._owner.instance._id)
            } else {
                markToRender(this._owner?.instance?._name, this._owner?.instance?._id)
            }
        }

        if (this._owner?.declaration?.prototype._dependants) {
            this._owner?.declaration?.prototype._dependants.forEach((d: string) => makeSureInstancesExist(d))
        }

        this._subscribers.forEach((fn: any) => fn(this.get()))
    }
}

export let SIGNAL_CALLBACK: string | null = null
export function signal<T>(input: any): (v?: any) => T {
    const ref = new Signal(input)
    ref._owner = getCurrentContext()
    if (ref._owner) ref._owner.index++

    function signalCallback(...args: any) {
        ref._owner = {
            index: 0,
            ...ref._owner,
            ...getCurrentContext(),
        }

        if (args.length === 0) {
            currentEffectDeps?.push(ref)
            return ref.get()
        }

        const isSuccessful = ref.set(args[0])
        if (isSuccessful) ref.notify()
    }

    signalCallback.prototype.toJSON = function() {
        return {
            __type: 'signal',
            value: ref._value,
        }
    }

    if (!SIGNAL_CALLBACK) {
        SIGNAL_CALLBACK = signalCallback.name
    }

    return signalCallback;
}

let currentEffectDeps: any[] | null = null
export function effect(fn: (v?: any) => void) {
    currentEffectDeps = []
    const component = getCurrentContext()

    fn()

    const deps = currentEffectDeps

    deps.forEach((dep) => {
        dep.subscribe(fn)
        dep.addDependant(component?.name)
    })

    const result = {
        invoke: fn,
        deps,
        destroy: () => deps.forEach((dep) => dep.unsubscribe(fn))
    }

    currentEffectDeps = null

    return result
}

export function compute(fn: any) {}

export let PROP_RECIVER: string | null = null
export function prop<T>(v: string | ((v?: any) => any)): (props: any) => (v?: any) => T {
    function propReciver(props: any): (v?: any) => T {
        const value = typeof v === 'function' ? v(props) : props[v]
        return signal(value)
    }

    if (!PROP_RECIVER) {
        PROP_RECIVER = propReciver.name
    }

    return propReciver
}
