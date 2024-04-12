import fs from 'fs'
import path from 'path'
import callsites from 'callsites'
import { nanoid } from 'nanoid'

interface DComponent {
    view?: string;
}

function Component(params?: DComponent) {
    return function (target: any) {
        const { view } = params ?? { view: null }
        const componentPath = callsites()[1].getFileName() as string

        target.prototype._view = view
        target.prototype._viewPath = view ? path.join(path.dirname(componentPath.replace('file:///', '')), view) : null

        target.prototype._view = function () {
            if (!target.prototype._viewPath) {
                return target.prototype.render()
            }

            return fs.readFileSync(target.prototype._viewPath, 'utf8')
        }

        target.prototype._name = target.name
        target.prototype._parent = null
        target.prototype._id = null
        target.prototype._key = null

        target.prototype.__init = function (props: any = {}) {
            this._parent = props._parent ?? {}
            this._id = props._id ?? nanoid(10)
            this._name = props._name ?? target.name
            this._key = props._key ?? null
        }

        target.prototype.__updateProps = function (props: Record<string, any> = {}) {
            const compProperties = Object.getOwnPropertyNames(this)
            for (const property of compProperties) {
                if (props?.[property]) {
                    this[property] = props[property]
                }
            }
        }

        return new Proxy(target, {
            construct(target, args) {
                const instance = new target(...args)

                return new Proxy(instance, {
                    set(target, property, value, receiver) {
                        const result = Reflect.set(target, property, value, receiver)
                        // console.log(`Property ${property.toString()} changed to ${value}`)
                        return result
                    }
                })
            }
        })
    }
}

export { Component }
