import hash from 'object-hash'

function TEST({title}) {
    return <div>{title}</div>
}


const props = {title: 'hello'}
const props2 = {title: 'hello'}

console.log(hash(props))
console.log(hash(props) === hash(props2)) // true












