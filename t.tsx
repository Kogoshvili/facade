import { callWithContext } from 'app/facade/server/Context'
import { signal } from 'app/facade/server/Signals-fe'

function test() {
    const a = signal(1)
    const b = signal('A')
    console.log(a(), b())
    a(2)
    b('B')
}

function test2() {
    const a = signal(100)
    const b = signal('X')
    console.log(a(), b())
    a(200)
    b('Z')
}

callWithContext(test.name, test) // 1 A
callWithContext(test.name, test) // 2 B


callWithContext(test2.name, test2) // 100 X
callWithContext(test2.name, test2) // 200 Z




