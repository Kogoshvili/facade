import Component from './types/component'

function makeComponent(component: any, props: any = {}, state: Record<string, any> = {}): Component {
    // eslint-disable-next-line new-cap
    const temp = new component(props)
    temp.__init(props)
    temp.__updateProps(state)
    temp.mount?.()
    return temp
}

export default makeComponent
