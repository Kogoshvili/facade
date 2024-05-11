export { }

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

declare global {
    namespace JSX {
        interface IntrinsicElements {
            [elemName: string]: any;
        }
    }
}

declare global {
    interface globalThis {
        fFragment: (props: { children: any }) => any
        fElement: (type: any, props: any, ...children: any) => any
    }
}