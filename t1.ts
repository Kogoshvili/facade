function set() {
    console.log('SET')
    return []
}

function s() {
    class A {
        static deps = set()
    }

    return A
}

s()
