import { encode } from 'html-entities'

function Facade({ component, xpath, ...props}: any)
{
    const propsString = JSON.stringify(props)

    return (
        <div data-component={component} data-props={encode(propsString)} data-xpath={xpath}></div>
    )
}

export default Facade
