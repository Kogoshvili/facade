import fs from 'fs'
import path from 'path'
import callsites from 'callsites'

interface DComponent {
    name: string;
    view: string;
    style?: string;
}

function Component({ name, view }: DComponent) {
    const componentPath = callsites()[1].getFileName() as string

    return function (target: any) { // class
        target.prototype._name = name
        target.prototype._viewPath = view

        target.prototype.render = function () {
            //! TODO: make something more efficient?
            const viewPath = path.join(path.dirname(componentPath.replace('file:///', '')), view)
            return fs.readFileSync(viewPath, 'utf8')
        }
    }
}

export { Component }
