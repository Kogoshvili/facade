/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/ban-types, @typescript-eslint/no-unsafe-declaration-merging */

export as namespace preact;

export interface ComponentClass<P = {}, S = {}> {
	new (props: P, context?: any): Component<P, S>; //
}
export interface Component<P = {}, S = {}> {
}

export abstract class Component<P, S> {
    constructor(props?: P);
}

