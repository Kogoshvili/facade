import makeComponent from 'facade/server/utils/factory'
import { components } from 'facade/server/index'
import { removeHiddenProperties } from './index'

function recreateInstances(instanceTree: any) {
    function resolveInstance(instance: any) {
        if (instance.parent !== null) {
            // find the parent instance
            const parentInstance = instanceTree[instance.parent.name].find((parent: any) => parent.id === instance.parent.id)
            // check if the parent instance exists
            if (parentInstance) {
                // check if the parent instance has an instance
                if (parentInstance.instance === null) {
                    resolveInstance(parentInstance)
                } else {
                    const oldProperties = removeHiddenProperties(instance.properties)
                    instance.instance = makeComponent(components[instance.name], {
                        _parent: parentInstance.instance,
                        _id: instance.id,
                        _name: instance.name,
                    }, oldProperties)
                    delete instance.properties
                }
            }
        } else {
            const oldProperties = removeHiddenProperties(instance.properties)
            instance.instance = makeComponent(components[instance.name], {
                _parent: null,
                _id: instance.id,
                _name: instance.name,
            }, oldProperties)
            delete instance.properties
        }
    }

    // loop through the keys of the tree
    for (const component in instanceTree) {
        // loop through the instances of the key
        for (const instance of instanceTree[component]) {
            resolveInstance(instance)
        }
    }

    return instanceTree
}

export default recreateInstances
