import { encode } from 'html-entities'
import { nanoid } from 'nanoid'

function Facade({ component, xpath, ...props}: any)
{
    const propsString = JSON.stringify(props)

    return (
        <div
            data-component={component}
            data-props={encode(propsString)}
            data-xpath={xpath}
            data-component-props={{ name: component, id: nanoid(10), key: props?.key || null }}
        ></div>
    )
}

export default Facade
