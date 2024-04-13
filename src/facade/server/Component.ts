import path from 'path'
import callsites from 'callsites'
import { getComponentInstanceFromGraph } from './ComponentManager'

interface ComponentProps {
    view?: string;
}

function Component(params?: ComponentProps) {
    return function (target: any) {
        const { view } = params ?? { view: null }
        const componentPath = callsites()[1].getFileName() as string

        target.prototype._view = view
        target.prototype._viewPath = view ? path.join(path.dirname(componentPath.replace('file:///', '')), view) : null

        target.prototype._name = target.name
        target.prototype._parent = null
        target.prototype._parentInstance = null
        target.prototype._id = null
        target.prototype._key = null

        target.prototype.parent = function () {
            if (!this._parent) {
                return null
            }

            if (!this._parentInstance) {
                this._parentInstance = getComponentInstanceFromGraph(this._parent.name, this._parent.id)
            }

            return this._parentInstance
        }

        // target.prototype._view = function () {
        //     if (!target.prototype._viewPath) {
        //         return target.prototype.render()
        //     }

        //     return fs.readFileSync(target.prototype._viewPath, 'utf8')
        // }
    }
}

export { Component }
