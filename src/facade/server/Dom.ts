import { parse } from 'node-html-parser'

let dom: any | null = null
let scripts: string = ''

export function getDOM() { return dom }
export function setDOM(pastDom: string) { dom = parse(pastDom) }
export function clearDOM() { dom = null }

export function getScripts() { return scripts }
export function clearScripts() { scripts = '' }

export function replaceElementById(idToFind: string, replacement: string) {
    if (!dom) return
    const element = dom.getElementById(idToFind)
    if (element) {
        element.replaceWith(parse(replacement))
    }
}

export function getElementById(idToFind: string) {
    if (!dom) return
    return dom.getElementById(idToFind)
}

export function appendScripts({ name, url } : { name: string, url: string }, componentNode: IComponentNode) {
    const wrapperd = `
        <script type="module" src="${url}" id="${name}.${componentNode.id}"></script>
        <script type="text/javascript">
            addEventListener('facade:state:updated', ({
                detail: { updatedProperties }
            }) => {
                const component = facade.state.find(
                    s => s.key === '${componentNode.name}/${componentNode.id}'
                ).value

                const methods = component.methods.reduce((acc, method) => {
                    acc[method] = async function() {
                        return await facade.request(
                            '${componentNode.name}',
                            '${componentNode.id}',
                            method,
                            arguments
                        )
                    }
                    return acc
                }, {})

                const thisMock = {
                    ...component.properties,
                    ...methods
                }

                const element = document.getElementById('${componentNode.name}.${componentNode.id}')

                if (updatedProperties === null || updatedProperties.some(i => i.componentName === '${componentNode.name}' && i.componentId === '${componentNode.id}'))
                {
                    FScripts['${name}'].script.call(thisMock, element)
                }
            })
        </script>
    `
    scripts += wrapperd
}
