import type { AnyRouter, InferRouterInitialContext } from "@orpc/server";
import { createRouterClient, resolveContractProcedures } from "@orpc/server";
import type { AgentApiConfig, AgentApiContextArgs } from "../index.ts";
import { describeSchema } from "../util/schema.ts";
import type { RpcAdapter } from "./types.ts";

interface OrpcProcedureDef {
	route?: Record<string, unknown>;
	meta?: Record<string, unknown>;
	inputSchema?: unknown;
	outputSchema?: unknown;
	errorMap?: Record<string, unknown>;
}

interface OrpcEntry {
	contract: { "~orpc": OrpcProcedureDef };
	path: readonly string[];
}

export const orpcAdapter: RpcAdapter<AnyRouter, unknown> = {
	name: "orpc",

	async list(router) {
		const paths: string[] = [];
		await resolveContractProcedures({ router, path: [] }, ({ path }) => {
			paths.push(path.join("."));
		});
		return paths.sort();
	},

	async describe(router, path) {
		const entry = await findEntry(router, path);
		if (!entry) return null;

		const def = entry.contract["~orpc"];
		return {
			path: entry.path.join("."),
			route: def.route ?? null,
			meta: def.meta ?? null,
			errors: def.errorMap ? Object.keys(def.errorMap) : [],
			input: def.inputSchema ? describeSchema(def.inputSchema) : null,
			output: def.outputSchema ? describeSchema(def.outputSchema) : null,
		};
	},

	async call(router, path, input, context) {
		const client = createRouterClient(router, { context });
		const target = walkDotted(client, path);

		if (typeof target !== "function") {
			throw new Error(`Procedure não é callable: ${path}`);
		}

		return await (target as (input?: unknown) => Promise<unknown>)(input);
	},
};

export function defineOrpcConfig<TRouter extends AnyRouter>(config: {
	router: TRouter;
	context: (
		args: AgentApiContextArgs,
	) => InferRouterInitialContext<TRouter> | Promise<InferRouterInitialContext<TRouter>>;
}): AgentApiConfig<TRouter, InferRouterInitialContext<TRouter>> {
	return {
		adapter: orpcAdapter as RpcAdapter<TRouter, InferRouterInitialContext<TRouter>>,
		router: config.router,
		context: config.context,
	};
}

async function findEntry(router: AnyRouter, target: string) {
	const matches: OrpcEntry[] = [];
	await resolveContractProcedures({ router, path: [] }, (options) => {
		if (options.path.join(".") === target) matches.push(options as unknown as OrpcEntry);
	});
	return matches[0] ?? null;
}

function walkDotted(root: unknown, path: string) {
	const parts = path.split(".");
	let target: unknown = root;

	for (const part of parts) {
		if (target === null || typeof target !== "object") return null;
		target = (target as Record<string, unknown>)[part];
	}

	return target ?? null;
}
