// d.ts declaration fro diff-json
declare module 'diff-json' {
    const applyChanges: (object: any, changes: any) => void
    const diff: (object1: any, object2: any) => any
    export { applyChanges, diff }
}