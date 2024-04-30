import { createElement, render } from 'preact'
import 'preact/hooks'
import { renderer } from '../server/JSXRenderer'
import { callWithContext } from '../server/Context'

const components: any = {}

export function registerComponents(componentsToRegister: any) {
    for (const key in componentsToRegister) {
        components[key] = componentsToRegister[key]
    }
}

export function initialize() {
    mountComponents()
    addEventListener('DOMContentLoaded', mountComponents)

    function mountComponents() {
        for (const key in components) {
            const elements = document.querySelectorAll(`[data-component="${key}"]`)
            elements.forEach(async (element) => {
                const xpath = element.getAttribute('data-xpath') || ''

                const rawProps = element.getAttribute('data-props') || '{}'
                const props = JSON.parse(rawProps)
                const component = components[key]
                console.log('TEST')
                let jsx: any = null

                callWithContext(component.name, () => jsx = component(props))

                render(jsx, element)

            })
        }
    }

    console.log('Client side facade')
}

export function getState() {
    return facade.state
}

export async function setState(newState: any) {
    return await facade.methods.pushState(newState)
}
