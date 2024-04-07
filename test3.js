/* eslint-disable */

const input = {
    "TodoItem": {
      "id": "aqP42nLvs3",
      "state": {
        "todo": "apple"
      },
      "parents": {
        "TodoList": [
          {
            "id": "aqP42nLvs3",
            "state": {
              "todos": [
                "apple",
                "banana",
                "cherry"
              ]
            },
            "parents": {}
          }
        ]
      }
    }
}

// Output:
// [
//     {
//         component: 'TodoList',
//         id: "aqP42nLvs3",
//         state: {
//             "todos": [
//                 "apple",
//                 "banana",
//                 "cherry"
//             ]
//         }
//     },
//     {
//         components: 'TodoItem',
//         id: "aqP42nLvs3",
//         state: {
//             todo: "apple"
//         },
//     }
// ]


function getHierarchicalArray(obj) {
    let result = []

    function traverse(node, parentComponent = undefined) {
        for (const [componentName, componentData] of Object.entries(node)) {
            const { parents, ...other } = componentData
            const hasParents = parents ? Object.keys(parents).length > 0 : false

            if (!hasParents) {
                result.unshift({ ...other, component: componentName }) // add to the beginning of the result array
            } else {
                for (const parentComponentName in parents) {
                    parents[parentComponentName].forEach(parentComponentData => {
                        traverse({[parentComponentName]: parentComponentData}, parentComponentName)
                    })
                }
                result.unshift({ ...other, component: componentName }) // add to the beginning of the result array after traversing the children
            }
        }
    }

    traverse(obj)
    return result
}

const output = getHierarchicalArray(input)

console.log(JSON.stringify(output, null, 2))
