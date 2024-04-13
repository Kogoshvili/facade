import fs from 'fs'
import path from 'path'
import callsites from 'callsites'

interface ComponentProps {
    view?: string;
}

export interface IComponent {
    _view?: string | null;
    _viewPath?: string | null;
    _name?: string;
    _parent?: IComponent | null;
    _id?: string;
    _key?: string | null;
    [key: string]: any;
}

export interface ComponentConstructor {
    __init(props: any): void;
    __updateProps(props: Record<string, any>): void;
}

function Component(params?: ComponentProps) {
    return function (target: any) {
        const { view } = params ?? { view: null }
        const componentPath = callsites()[1].getFileName() as string

        target.prototype._view = view
        target.prototype._viewPath = view ? path.join(path.dirname(componentPath.replace('file:///', '')), view) : null

        target.prototype._name = target.name
        target.prototype._parent = null
        target.prototype._id = null
        target.prototype._key = null

        target.prototype._view = function () {
            if (!target.prototype._viewPath) {
                return target.prototype.render()
            }

            return fs.readFileSync(target.prototype._viewPath, 'utf8')
        }
    }
}

export { Component }
