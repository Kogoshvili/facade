// d.ts declaration fro diff-json
declare module 'diff-json' {
    const applyChanges: (object: any, changes: any) => void
    const diff: (object1: any, object2: any) => any
    export { applyChanges, diff }
}

declare module 'json-diff-ts' {
    const diff: (oldObj: any, newObj: any) => any
    const flattenChangeset: (changeset: any) => any
    export { diff, flattenChangeset }
}
