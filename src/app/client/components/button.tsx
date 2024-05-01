import { signal } from 'app/facade/server/Signals-fe'

function Button({ text, onClick }) {
    const counter = signal(0)

    const handleClick = () => {
        counter(counter() + 1)
        console.log(counter())
        if (counter() >= 10) {
            eval(onClick)
        }
    }

    return (
        <button onClick={handleClick}>{text}{counter()}</button>
    )
}

export default Button
