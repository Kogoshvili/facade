import Component from './types/component'

function updateProperties(temp: any, props: Record<string, any>) {
    const compProperties = Object.getOwnPropertyNames(temp)
    for (const property of compProperties) {
        if (props[property]) {
            temp[property] = props[property]
        }
    }
    return temp
}

function makeComponent(component: any, props: any = {}, state: Record<string, any> = {}): Component {
    // eslint-disable-next-line new-cap
    const temp = new component(props)
    return updateProperties(temp, state)
}

export default makeComponent
