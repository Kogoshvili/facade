import { parse } from 'node-html-parser'
import { IComponentNode } from './Interfaces'

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
    scripts += `
        <script type="module" src="${url}" id="${componentNode.name}.${componentNode.id}"></script>
        <script type="text/javascript">
            addEventListener('facade:state:loaded', function () {
                facade.execute('${name}', '${componentNode.name}', '${componentNode.id}', 'script')
            })

            addEventListener('facade:state:updated', function ({ detail: { updatedProperties } }) {
                if (updatedProperties && updatedProperties.some(i => i.componentName === '${componentNode.name}' && i.componentId === '${componentNode.id}')) {
                    facade.execute('${name}', '${componentNode.name}', '${componentNode.id}', 'scriptOnState')
                }
            })
        </script>
    `
}
