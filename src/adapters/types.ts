export interface SchemaDescription {
	vendor: string;
	jsonSchema?: unknown;
	note?: string;
}

export interface ProcedureMeta {
	path: string;
	type?: "query" | "mutation" | "subscription" | null;
	input?: SchemaDescription | null;
	output?: SchemaDescription | null;
	meta?: Record<string, unknown> | null;
	route?: Record<string, unknown> | null;
	errors?: string[];
}

export interface RpcAdapter<TRouter = unknown, TContext = unknown> {
	name: "orpc" | "trpc";
	list(router: TRouter): Promise<string[]> | string[];
	describe(router: TRouter, path: string): Promise<ProcedureMeta | null> | ProcedureMeta | null;
	call(router: TRouter, path: string, input: unknown, context: TContext): Promise<unknown>;
}
