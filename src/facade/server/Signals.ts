import { makeSureInstancesExist } from './ComponentGraph'
import { getCurrentComponent } from './ComponentRegistry'
import { currentInjectable } from './decorators/Injection';

export interface ISignal<T> {
    (v?: T | (() => T)): T;
    _value: T
    _subscribers: (() => void)[]
    _dependants: string[]
    set(v: any): boolean
    get(): any
    subscribe(fn: (v?: any) => void): void
    unsubscribe(fn: (v?: any) => void): void
    notify(): void
}

class Signal {
    _value: any
    _subscribers: (() => void)[] = []
    _owner: null | { prototype: { _dependants: Set<string> }} = null
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

    addDependant(dep: string) {
        this._owner?.prototype._dependants.add(dep)
    }

    removeDependant(dep: string) {
        this._owner?.prototype._dependants.delete(dep)
    }

    subscribe(fn: any) {
        this._subscribers.push(fn)
    }

    unsubscribe(fn: any) {
        this._subscribers = this._subscribers
            .filter((subscriber: any) => subscriber !== fn)
    }

    notify() {
        this._owner?.prototype._dependants.forEach((d: string) => makeSureInstancesExist(d))
        this._subscribers.forEach((fn: any) => fn(this.get()))
    }
}


function signal(input: any) {
    const ref = new Signal(input)
    ref._owner = currentInjectable

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
            return (ref as any)[p]
        },
    })
}

let currentEffectDeps: any[] | null = null

function effect(fn: (v?: any) => void) {
    currentEffectDeps = []
    const component = getCurrentComponent()

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

// content = effect(
//     () => this.modalService().modal(),
//     [this.modalService().modal]
// )

// function effect<T = any>(fn: (v?: any) => void, deps: any[]): () => T {
//     const result = fn()
//     const ref = new Signal(result)

//     deps.forEach((dep) => dep.subscribe(fn))

//     function callback() {
//         return ref.get()
//     }

//     callback.prototype.toJSON = function() {
//         return { __type: 'effect', value: ref.get() }
//     }

//     callback.prototype.destroy = function() {
//         deps.forEach((dep) => dep.unsubscribe(fn))
//     }

//     callback.prototype._reinit = function() {
//         const result = fn()
//         ref.set(result)
//     }

//     return new Proxy(callback, {
//         get: (target: any, p: string | symbol, _receiver: any): any => {
//             if (target.prototype[p]) return target.prototype[p]
//             return (ref as any)[p]
//         },
//     })
// }



export { signal, effect }
