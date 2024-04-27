import { useState } from 'preact/hooks'

function Button({ text, onClick }: any)
{
    const [counter, setCounter] = useState(0)

    const handleClick = () => {
        setCounter(counter + 1)
        if (counter >= 10) {
            eval(onClick)
        }
    }

    return (
        <button onClick={handleClick}>{text}{counter}</button>
    )
}

export default Button
