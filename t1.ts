function set() {
    console.log('SET')
    return []
}

class A {
    static deps = set()
    constructor() {
        console.log('CONST')
    }
}

const s = new A()
