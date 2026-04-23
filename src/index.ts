import type { RpcAdapter } from "./adapters/types.ts";

export type { ProcedureMeta, RpcAdapter, SchemaDescription } from "./adapters/types.ts";

export interface AgentApiContextArgs {
	as?: string;
}

export interface AgentApiConfig<TRouter = unknown, TContext = unknown> {
	adapter: RpcAdapter<TRouter, TContext>;
	router: TRouter;
	context: (args: AgentApiContextArgs) => TContext | Promise<TContext>;
}

export function defineConfig<TRouter, TContext>(config: AgentApiConfig<TRouter, TContext>) {
	return config;
}
