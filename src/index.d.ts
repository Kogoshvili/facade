export { }

declare global {
    var React: any

    var fFragment: (props: { children: any }) => any
    var fElement: (type: any, props: any, ...children: any) => any

    namespace JSX {
        interface IntrinsicElements {
            [elemName: string]: any;
        }
    }
}
