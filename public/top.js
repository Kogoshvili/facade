if (!window.smog) {
    window.smog = {}
}

function buildDOMTree(element, parentTree = window.smog) {
    if (element.nodeType !== Node.ELEMENT_NODE) return
    const smolAttr = element.getAttribute('smol')
    if (smolAttr) {
        const [key, id] = smolAttr.split('.')

        if (key !== 'root') {
            const stateAttr = element.getAttribute('smol-state')
            const state = stateAttr ? JSON.parse(stateAttr) : {}

            if (!parentTree[key]) {
                parentTree[key] = []
            }

            let componentObj = parentTree[key].find(obj => obj.id === id)
            if (!componentObj) {
                componentObj = {
                    id: id,
                    state: state,
                    parents: {},
                }
                parentTree[key].push(componentObj)
            } else {
                // Update the state if the component object already exists
                Object.assign(componentObj.state, state)
            }

            // get closest parent with smol attribute
            let parent = element.parentElement
            while (parent && !parent.getAttribute('smol')) {
                parent = parent.parentElement
            }

            if (parent) {
                const parentSmolAttr = parent.getAttribute('smol')
                const [parentKey, parentId] = parentSmolAttr.split('.')

                if (parentKey !== 'root') {
                    if (!parentTree[parentKey]) {
                        parentTree[parentKey] = []
                    }

                    let parentObj = parentTree[parentKey].find(obj => obj.id === parentId)
                    if (!parentObj) {
                        const parentStateAttr = parent.getAttribute('smol-state')
                        const parentState = parentStateAttr ? JSON.parse(parentStateAttr) : {}
                        parentObj = {
                            id: parentId,
                            state: parentState,
                            parents: {},
                        }
                        parentTree[parentKey].push(parentObj)
                    }

                    if (!componentObj.parents[parentKey]) {
                        componentObj.parents[parentKey] = []
                    }

                    if (!componentObj.parents[parentKey].find(obj => obj.id === parentId)) {
                        componentObj.parents[parentKey].push(parentObj)
                    }
                }
            }
        }
    }

    Array.from(element.childNodes).forEach((child) => buildDOMTree(child, parentTree))
}

const observer = new MutationObserver((mutations) => {
    mutations
        .map(mutation => {
            if (mutation.type !== 'childList') return mutation
            if (mutation.removedNodes.length > 0 && mutation.removedNodes[0]?.nodeType === Node.ELEMENT_NODE) {
                const removedNode = mutation.removedNodes[0]
                const smolAttr = removedNode.getAttribute('smol')
                if (smolAttr) {
                    const [key, id] = smolAttr.split('.')
                    window.smog[key] = window.smog[key].filter(obj => obj.id !== id)
                }
            }
            return mutation
        })
        .map(mutation => {
            if (mutation.type !== 'childList') return mutation
            if (mutation.addedNodes.length > 0 && mutation.addedNodes[0]?.nodeType === Node.ELEMENT_NODE) buildDOMTree(mutation.addedNodes[0])
            return mutation
        })
})

// const observer2 = new MutationObserver((mutations) => {
//     mutations
//         .map(mutation => {
//             if (mutation.type === 'attributes' && mutation.attributeName === 'smol-state') {
//                 const newState = mutation.target.getAttribute('smol-state')
//                 const [key, id] = mutation.target.getAttribute('smol').split('.')
//                 const component = window.smog[key].find(obj => obj.id === id)

//                 if (component) {
//                     component.state = JSON.parse(newState)
//                 } else {
//                     buildDOMTree(mutation.target)
//                 }
//             }
//             return mutation
//         })
// })

observer.observe(document, {
    childList: true,
    subtree: true
})

// dom loaded event
window.addEventListener('DOMContentLoaded', () => {
    observer.disconnect()
})

// observer2.observe(document, {
//     childList: true,
//     subtree: true,
//     attributes: true,
//     attributeOldValue: true,
//     attributeFilter: ['smol', 'smol-state'],
// })
