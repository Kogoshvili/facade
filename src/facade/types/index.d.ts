export as namespace preact;

export interface ComponentClass<P = {}, S = {}> {
	new (props: P, context?: any): Component<P, S>; //
	// displayName?: string;
	// defaultProps?: Partial<P>;
	// contextType?: Context<any>;
	// getDerivedStateFromProps?(
	// 	props: Readonly<P>,
	// 	state: Readonly<S>
	// ): Partial<S> | null;
	// getDerivedStateFromError?(error: any): Partial<S> | null;
}
export interface Component<P = {}, S = {}> {
	// componentWillMount?(): void;
	// componentDidMount?(): void;
	// componentWillUnmount?(): void;
	// getChildContext?(): object;
	// componentWillReceiveProps?(nextProps: Readonly<P>, nextContext: any): void;
	// shouldComponentUpdate?(
	// 	nextProps: Readonly<P>,
	// 	nextState: Readonly<S>,
	// 	nextContext: any
	// ): boolean;
	// componentWillUpdate?(
	// 	nextProps: Readonly<P>,
	// 	nextState: Readonly<S>,
	// 	nextContext: any
	// ): void;
	// getSnapshotBeforeUpdate?(oldProps: Readonly<P>, oldState: Readonly<S>): any;
	// componentDidUpdate?(
	// 	previousProps: Readonly<P>,
	// 	previousState: Readonly<S>,
	// 	snapshot: any
	// ): void;
	// componentDidCatch?(error: any, errorInfo: ErrorInfo): void;
}

export abstract class Component<P, S> {
	constructor(props?: P); // , context?: any

	// static displayName?: string;
	// static defaultProps?: any;
	// static contextType?: Context<any>;

	// // Static members cannot reference class type parameters. This is not
	// // supported in TypeScript. Reusing the same type arguments from `Component`
	// // will lead to an impossible state where one cannot satisfy the type
	// // constraint under no circumstances, see #1356.In general type arguments
	// // seem to be a bit buggy and not supported well at the time of this
	// // writing with TS 3.3.3333.
	// static getDerivedStateFromProps?(
	// 	props: Readonly<object>,
	// 	state: Readonly<object>
	// ): object | null;
	// static getDerivedStateFromError?(error: any): object | null;

	// state: Readonly<S>;
	// props: RenderableProps<P>;
	// context: any;
	// base?: Element | Text;

	// // From https://github.com/DefinitelyTyped/DefinitelyTyped/blob/e836acc75a78cf0655b5dfdbe81d69fdd4d8a252/types/react/index.d.ts#L402
	// // // We MUST keep setState() as a unified signature because it allows proper checking of the method return type.
	// // // See: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/18365#issuecomment-351013257
	// setState<K extends keyof S>(
	// 	state:
	// 		| ((
	// 				prevState: Readonly<S>,
	// 				props: Readonly<P>
	// 		  ) => Pick<S, K> | Partial<S> | null)
	// 		| (Pick<S, K> | Partial<S> | null),
	// 	callback?: () => void
	// ): void;

	// forceUpdate(callback?: () => void): void;

	// abstract render(
	// 	props?: RenderableProps<P>,
	// 	state?: Readonly<S>,
	// 	context?: any
	// ): ComponentChild;
}

