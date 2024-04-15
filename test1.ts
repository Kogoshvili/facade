// // class Ref {
// //     value: any

// //     constructor(v: any) {
// //         this.value = v
// //     }

// //     set(v: any) {
// //         this.value = v
// //     }
// // }


// // function signal(input: any) {
// //     const ref = new Ref(input)

// //     // const ref = {
// //     //     value: input,
// //     //     _signal: true,
// //     //     set(v: any) {
// //     //         this.value = v
// //     //     },
// //     //     get() {
// //     //         return this.value
// //     //     }
// //     // }

// //     return ref;
// //     return new Proxy(ref, {
// //         get: (target: any, p: string | symbol, receiver: any): any => {
// //             console.log(target, p, receiver, arguments)
// //             return Reflect.get(target, p, receiver)
// //         },
// //         set: (target: any, p: string | symbol, newValue: any, receiver: any): boolean => {
// //             return Reflect.set(target, p, newValue, receiver)
// //         },
// //         apply: (target: any, thisArg: any, argArray: any[]): any => {
// //             console.log(target, thisArg, argArray, arguments)
// //         }
// //     })
// // }

// // const value = signal(1)

// // console.log(value())
// // // console.log(value.value)
// // value.set(2)
// // console.log(value())
// // // console.log(JSON.stringify(value))

// function signal(input: any) {
//     function foo(v: any) {
//         this.value = v
//         const that = this

//         function callback() {
//             return that.value
//         }

//         callback.prototype.set = function(v: any) {
//             that.value = v
//         }

//         callback.prototype.get = function() {
//             return that.value
//         }

//         return callback
//     }

//     // foo.prototype.set = function(v: any) {
//     //     this.value = v
//     // }

//     // foo.prototype.get = function() {
//     //     return this.value
//     // }

//     return new foo(input)
// }


// const a = signal(1)

// console.log(a())
// console.log(a.prototype.get())

class Signal {
    value: any
    _subscribers: any[]

    constructor(input: any) {
        this.value = input
        this._subscribers = []
    }

    set(v: any) {
        if (typeof v === 'function') {
            this.value = v(this.value)
            return true
        }

        this.value = v
        return true
    }

    get() {
        return typeof this.value === 'function' ? this.value() : this.value
    }

    subscribe(fn: any, context: any = null) {
        // console.log(context)
        this._subscribers.push(fn)
    }

    unsubscribe(fn: any) {
        this._subscribers = this._subscribers.filter((subscriber) => subscriber !== fn)
    }

    notify() {
        this._subscribers.forEach((fn) => fn())
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

function e(fn: () => void, deps: any[]) {
    fn()
    deps.forEach((dep) => dep.subscribe(fn, this))
    return () => deps.forEach((dep) => dep.unsubscribe(fn))
}

const effect = new Proxy(e, {
    apply: (_target: any, _thisArg: any, args: any[]): any => {
        console.log('Effect', _target, _thisArg, args)
        return Reflect.apply(_target, _thisArg, args)
    }
})


class Service {
    t = signal(1)

    constructor() {}
}

class Test1 {
    service

    constructor(s) {
        this.service = s
    }

    init() {
        console.log(this.service.t())
        // effect(() => { console.log('Effect', this.service.t()) }, [this.service.t])
    }
}

const service1 = new Service()
const test1 = new Test1(service1)
test1.init()
// service1.t(10)
// delete test1
// console.log(service1.t._subscribers)


// const t = signal(1)

// // console.log(t())
// // console.log(t(undefined))
// // t(3)
// // t((v: number) => v % 2 ? v + 1 : v - 1)

// const b = signal(20)
// const sum = signal(() => t() + b())
// console.log(sum())
// t(40)
// console.log(sum())

// effect(() => { console.log('Effect', t()) }, [t])

// t(10)
// effect(() => { console.log('Effect', t()) }, [t])
// // console.log(t())

// t(100)



class MyClass1 {
    constructor() {}

    myMethod() {
        somefunction() // console.logs(MyClass1)
    }
}

class MyClass2 {
    constructor() {}

    myMethod() {
        somefunction() // console.logs(MyClass2)
    }
}
