import { renderer } from 'facade/server/JSXRenderer'
import { mountFacade } from './facade';

const components: any = {}

export function registerComponents(componentsToRegister: any) {
    for (const key in componentsToRegister) {
        components[key] = componentsToRegister[key]
    }
}

export function initialize() {
    mountFacade()
    mountComponents()
    addEventListener('DOMContentLoaded', mountComponents)
    console.log('Client side facade')
}

function mountComponents() {
    for (const key in components) {
        const elements = document.querySelectorAll(`[data-component="${key}"]`)
        elements.forEach(async (element) => {
            const xpath = element.getAttribute('data-xpath') || ''

            const rawProps = element.getAttribute('data-props') || '{}'
            const props = JSON.parse(rawProps)
            const component = components[key]
            element.outerHTML = await renderer(fElement(component, props), null, xpath)
        })
    }
}

export function getState() {
    return facade.state
}

export async function setState(newState: any) {
    return await facade.methods.pushState(newState)
}
