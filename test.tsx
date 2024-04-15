import { JSXInternal } from 'preact/src/jsx'


// eslint-disable-next-line @typescript-eslint/ban-types
class Component<P = {}> {
    props: any

    constructor(props: P) {
        this.props = props
    }
}

interface ChildProps {
    name: string
}

class ChildComponent extends Component<ChildProps> {
    name: string
    // key: number

    constructor(props: ChildProps) {
        super(props)
        this.name = props.name
        // this.key = props.key
    }

    render() {
        return (
            <li key={this.key}>
                {this.name}
            </li>
        )
    }
}

class ParentComponent {
    elements: any[] = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Doe' },
        { id: 3, name: 'Jane' },
    ]

    handleClick() {
        console.log('Button clicked')
    }

    render() {
        return (
            <div className={'asd'}>
                {/* <button onClick={() => console.log('TEST')}>Click me</button> */}
                <h1>Parent Component</h1>
                <ChildComponent todo={'test'} shit={1}/>
                {/* <p>This is a paragraph</p>
                <input type="checkbox" checked={false} />
                <>
                    <p>This is a paragraph inside a fragment</p>
                    <p>Another paragraph inside the fragment</p>
                </>
                {true && <p>This paragraph is conditionally rendered</p>}
                {false && <p>This paragraph is not rendered</p>}
                {null}
                {undefined}
                <ul>
                    {
                        this.elements.map((element: any) => {
                            //@ts-ignore
                            return <ChildComponent key={element.id} name={element.name} />
                        })
                    }
                </ul> */}
            </div>
        )
    }
}
const myComponent = new ParentComponent()
const template = myComponent.render()
function renderer(jsx: JSXInternal.Element | null): string {
    // console.log('START', jsx)
    // @ts-ignore
    if (jsx === null || jsx === false || jsx === undefined) {
        return ''
    }

    if (typeof jsx === 'string') {
        return jsx
    }

    const elementType = jsx.type

    // Normal HTML element
    if (typeof elementType === 'string') {
        let result = `<${elementType}`

        if (jsx.key) {
            result += ` key="${jsx.key}"`
        }

        const { children, ...props } = jsx.props

        // Render element attributes
        for (const key in props) {
            if (props.hasOwnProperty(key)) {
                const value = props[key]
                console.log(value)
                if (typeof value === 'boolean') {
                    // Render boolean attribute without a value if it is true
                    if (value) {
                        result += ` ${key}`
                    }
                } else if (typeof value === 'function') {
                    // Event handler
                    const eventName = key.startsWith('on') ? key.toLowerCase().slice(2) : key
                    // store value (anonymous function) somewhere on class

                    result += ` ${eventName}="${value.name}"`
                } else {
                    // Render attribute with a value
                    result += ` ${key}="${value}"`
                }
            }
        }

        // Check if the element is self-closing
        const isSelfClosing = !children || (Array.isArray(children) && children.length === 0)

        if (isSelfClosing) {
            result += ' />'
        } else {
            result += '>'

            if (children) {
                if (typeof children === 'string') {
                    result += children
                } else if (Array.isArray(children)) {
                    result += children.map(child => renderer(child)).join('')
                } else if (typeof children === 'function') {
                    result += renderer(children())
                } else {
                    if (typeof children.type === 'function') {
                        const fragmentResult = children.type(children.props)

                        if (Array.isArray(fragmentResult)) {
                            result += fragmentResult.map(child => renderer(child)).join('')
                        } else {
                            result += renderer(fragmentResult)
                        }
                    } else {
                        result += renderer(children)
                    }
                }
            }

            result += `</${elementType}>`
        }

        return result
    }

    if (isClass(elementType)) {
        // Custom component
        const props = jsx.props || {}
        props.key = jsx.key
        // @ts-ignore
        const component = new elementType(props)
        if (component.render === undefined) {
            console.error(`Component ${elementType.name} is missing a render method`)
        }
        return renderer(component.render())
    }

    // @ts-ignore
    const fragmentResult = elementType(jsx.props)

    if (Array.isArray(fragmentResult)) {
        return fragmentResult.map(child => renderer(child)).join('')
    } else {
        return renderer(fragmentResult)
    }
}

function isClass(fn: any) {
    return (
        typeof fn === 'function' &&
        Object.getOwnPropertyDescriptor(fn, 'prototype')?.writable === false
    )
}

console.log(renderer(template))
