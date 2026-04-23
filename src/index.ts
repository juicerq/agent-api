import type { AnyRouter, InferRouterInitialContext } from "@orpc/server";

export interface AgentApiContextArgs {
	as?: string;
}

export interface AgentApiConfig<TRouter extends AnyRouter> {
	router: TRouter;
	context: (
		args: AgentApiContextArgs,
	) =>
		| InferRouterInitialContext<TRouter>
		| Promise<InferRouterInitialContext<TRouter>>;
}

export function defineConfig<TRouter extends AnyRouter>(
	config: AgentApiConfig<TRouter>,
) {
	return config;
}
