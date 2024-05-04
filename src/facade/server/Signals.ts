import { makeSureInstancesExist, markToRender } from './ComponentGraph'
import { getCurrentContext } from './Context';
import { currentInjectable } from './Injection'

export interface ISignal<T> {
    (v?: T | (() => T)): T;
    _value: T
    _subscribers: (() => void)[]
    _owner: null | { prototype: { _dependants: Set<string> }}
    set(v: any): boolean
    get(): any
    subscribe(fn: (v?: any) => void): void
    unsubscribe(fn: (v?: any) => void): void
    notify(): void
}

class Signal {
    _value: any
    _subscribers: (() => void)[] = []
    _owner: null | {
        name?: string | undefined;
        instance?: any;
        declaration?: any;
        index: number;
    } = null

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
        if (this._owner?.declaration?.prototype._dependants) {
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
        console.log('Notifying', this._owner?.instance?._name, this._owner?.declaration)
        if (this._owner?.instance) {
            markToRender(this._owner?.instance?._name, this._owner?.instance?._id)
        }

        if (this._owner?.declaration?.prototype._dependants) {
            this._owner?.declaration?.prototype._dependants.forEach((d: string) => makeSureInstancesExist(d))
        }

        this._subscribers.forEach((fn: any) => fn(this.get()))
    }
}

function signal(input: any) {
    const ref = new Signal(input)
    ref._owner = getCurrentContext()

    function signalF(...args: any) {
        currentEffectDeps?.push(ref)

        ref._owner = {
            index: 0,
            ...ref._owner,
            ...getCurrentContext(),
        }

        if (args.length === 0) return ref.get()
        const isSuccessful = ref.set(args[0])
        if (isSuccessful) ref.notify()
    }

    signalF.prototype.toJSON = function() {
        return {
            __type: 'signal',
            value: ref._value,
        }
    }

    return signalF;
    return new Proxy(callback, {
        get: (target: any, p: string | symbol, _receiver: any): any => {
            if (target.prototype[p]) return target.prototype[p]
            return (ref as any)[p]
        },
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

function compute(fn: any) {}

export { signal, effect, compute }
