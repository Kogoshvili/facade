export { }

declare global {
    const fFragment: (props: { children: any }) => any
    const fElement: (type: any, props: any, ...children: any) => any

    namespace JSX {
        interface IntrinsicElements {
            [elemName: string]: any;
        }
    }
}
