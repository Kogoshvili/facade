import { parse } from 'node-html-parser'
import { IComponentNode } from './Interfaces'

let dom: any | null = null
let scripts: string[] = []
let styles: string[] = []

export function getDOM() { return dom }
export function setDOM(pastDom: string) { dom = parse(pastDom) }
export function clearDOM() { dom = null }

export function getScripts() { return scripts }
export function clearScripts() { scripts = [] }

export function getStyles() { return styles }
export function clearStyles() { styles = [] }

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
    scripts.push(`
        <script
            type="text/javascript"
            src="${url}"
            onload="loaded('${name}', '${componentNode.name}', '${componentNode.id}')"
        ></script>
    `)
}

export function appendStyles({ url } : { url: string }) {
    styles.push(`
        <link
            href="${url}"
            rel="stylesheet"
        ></link>
    `)
}
