import { renderer } from '../server/JSXRenderer'
import './facade';
import { getGraph } from '../server/ComponentGraph';

const components: any = {}

export function registerComponents(componentsToRegister: any) {
    for (const key in componentsToRegister) {
        components[key] = componentsToRegister[key]
    }
}

export function initialize() {
    mountComponents()
    addEventListener('DOMContentLoaded', mountComponents)
}

function mountComponents() {
    const graph = getGraph()

    for (const key in components) {
        const elements = document.querySelectorAll(`[data-component="${key}"]`)
        elements.forEach(async (element) => {
            const xpath = element.getAttribute('data-xpath') || ''

            const rawProps = element.getAttribute('data-props') || '{}'
            const props = JSON.parse(rawProps)
            const component = components[key]
            const renderResult = await renderer(fElement(component, props), null, xpath)

            // get ID of from renderResult
            const id = renderResult.match(/id="([^"]*)"/)?.[1]

            element.outerHTML = renderResult

            const renderedElement = document.getElementById(id)
            if (renderedElement) {
                graph.getVertexValue(id)?.instance?.renderd?.(renderedElement)

                graph.executeOnChildren(id, (key, value) => {
                    const childElement = document.getElementById(key)
                    if (childElement) {
                        value?.instance?.renderd?.(childElement)
                    }
                })
            }
        })
    }
}

export function getState() {
    return facade.state
}

export async function setState(newState: any) {
    return await facade.methods.pushState(newState)
}
