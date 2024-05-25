import { makeSureInstancesExist, markToRender } from './ComponentGraph'
import { IContext, getCurrentContext } from './Context';
import { rerenderComponent } from './JSXRenderer';

const isClinet = !(typeof process === 'object')

class Signal {
    __type: string = 'signal'
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

    addDependant(dep: string, index: number) {
        if (this._owner?.declaration) {
            this._owner.declaration.prototype._dependants ??= {}
            this._owner.declaration.prototype._dependants[dep] ??= new Set()
            this._owner.declaration.prototype._dependants[dep].add(index)
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
        if (this._owner?.name && this._owner?.id) {
            if (isClinet) {
                rerenderComponent(this._owner.name, this._owner.id)
            } else {
                markToRender(this._owner.name, this._owner?.id)
            }
        }

        if (this._owner?.declaration?.prototype?._dependants) {
            const dependants = this._owner?.declaration?.prototype._dependants
            Object.keys(dependants).forEach((d) => {
                const vertices = makeSureInstancesExist(d)
                vertices.forEach((vertex) => {
                    if (vertex && vertex.instance) {
                        dependants[d].forEach((i: number) => {
                            (vertex.instance!.effects as any)?.[i]?.()
                        })
                    }
                })
            })
        }

        this._subscribers.forEach((fn: any) => fn(this.get()))
    }
}

export let SIGNAL_CALLBACK: string | null = null
export function signal<T>(input: any): (v?: any) => T {
    const ref = new Signal(input)
    ref._owner = getCurrentContext()
    ref.__type = 'signal'
    if (ref._owner) ref._owner.index++

    function signalCallback(...args: any) {
        // @ts-ignore
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
            __type: ref.__type,
            value: ref._value,
        }
    }

    signalCallback.prototype.set = ref.set

    signalCallback.prototype.setType = function(type: string) {
        ref.__type = type
    }

    SIGNAL_CALLBACK = signalCallback.name

    return signalCallback
}

export let PROP_RECIVER: string | null = null
// return type is a lie actual is (props: any) => (v?: any) => T
export function prop<T>(v: string | ((v?: any) => any)): (v?: any) => T {
    function propReciver(props: any): (v?: any) => T {
        const value = typeof v === 'function' ? v(props) : props[v]
        const res = signal<T>(value)
        res.prototype.setType('prop')
        return res
    }

    PROP_RECIVER ??= propReciver.name

    return propReciver as any
}

let currentEffectDeps: any[] | null = null
export function executeEffect(fn: (v?: any) => void, depOverrides?: Signal[]) {
    currentEffectDeps = []
    const component = getCurrentContext()

    fn()

    if (depOverrides) {
        currentEffectDeps = depOverrides
    }

    currentEffectDeps.forEach((dep) => {
        dep.subscribe(fn)
        dep.addDependant(component?.name, component?.index)
    })

    currentEffectDeps = []
}

export function compute(fn: any) {}
