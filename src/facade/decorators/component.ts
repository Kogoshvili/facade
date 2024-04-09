import fs from 'fs'
import path from 'path'
import callsites from 'callsites'

interface DComponent {
    view: string;
}

function Component({ view }: DComponent) {
    const componentPath = callsites()[1].getFileName() as string

    return function (target: any) { // class
        target.prototype._view = view
        target.prototype._viewPath = path.join(path.dirname(componentPath.replace('file:///', '')), view)

        target.prototype._view = function () {
            //! TODO: make something more efficient?
            return fs.readFileSync(target.prototype._viewPath, 'utf8')
        }

        target.prototype._name = target.name
        target.prototype._parent = null
        target.prototype._id = null

        target.prototype.__init = function (props: any = {}) {
            this._parent = props._parent
            this._id = props._id
            this._name = props._name
        }

        target.prototype.__updateProps = function (props: Record<string, any> = {}) {
            const compProperties = Object.getOwnPropertyNames(this)
            for (const property of compProperties) {
                if (props?.[property]) {
                    this[property] = props[property]
                }
            }
        }
    }
}

export { Component }