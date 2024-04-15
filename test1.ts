
const a = () => 1;
const b = (v)  => v;
const c = (v, v2) => v + v2;
const d = d => d;

[a, b, c, d].forEach((fn) => {
    const str = fn.toString()
    console.log(str)
})

// const str = "onRemove(){this.parent().handleRemove(this.todo.id)}"
// const ast = acorn.parse(str, {ecmaVersion: 2022})
// console.log(ast.body[0].expression)
()=>1
v=>v
(v,v2)=>v+v2
d2=>d2
