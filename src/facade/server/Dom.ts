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
        <script type="text/javascript">
            var script = document.createElement('script');
            script.src = '${url}';
            script.onload = function () {
                console.debug('Loaded', '${name}', '${componentNode.name}', '${componentNode.id}')
                if (window.facade) {
                    facade.loaded('${name}', '${componentNode.name}', '${componentNode.id}')
                }
            };
            document.head.appendChild(script);
        </script>
    `
}
