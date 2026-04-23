import type { AnyTRPCRouter, inferRouterContext } from "@trpc/server";
import type { AgentApiConfig, AgentApiContextArgs } from "../index.ts";
import { describeSchema } from "../util/schema.ts";
import type { ProcedureMeta, RpcAdapter } from "./types.ts";

type ProcedureType = "query" | "mutation" | "subscription";

interface TrpcProcedureDef {
	type: ProcedureType;
	inputs?: unknown[];
	meta?: Record<string, unknown>;
}

type TrpcProcedure = ((opts: {
	ctx: unknown;
	input: unknown;
	path: string;
	type: ProcedureType;
	getRawInput: () => Promise<unknown>;
	signal: AbortSignal | undefined;
}) => Promise<unknown>) & {
	_def: TrpcProcedureDef;
};

interface TrpcOutputTransformer {
	serialize: (value: unknown) => unknown;
}

function getProcedures(router: AnyTRPCRouter) {
	const def = router._def as unknown as { procedures: Record<string, TrpcProcedure> };
	return def.procedures;
}

function getOutputTransformer(router: AnyTRPCRouter): TrpcOutputTransformer | null {
	const cfg = (router._def as unknown as { _config?: { transformer?: unknown } })._config;
	const t = cfg?.transformer as { output?: TrpcOutputTransformer } | undefined;
	return t?.output?.serialize ? t.output : null;
}

function buildTrpcAdapter(serializeOutput: boolean): RpcAdapter<AnyTRPCRouter, unknown> {
	return {
		name: "trpc",

		list(router) {
			return Object.keys(getProcedures(router)).sort();
		},

		describe(router, path) {
			const proc = getProcedures(router)[path];
			if (!proc) return null;

			const def = proc._def;
			const inputs = def.inputs ?? [];
			const firstInput = inputs[0];

			return {
				path,
				type: def.type,
				input: firstInput ? describeSchema(firstInput) : null,
				meta: def.meta ?? null,
			} satisfies ProcedureMeta;
		},

		async call(router, path, input, context) {
			const proc = getProcedures(router)[path];
			if (typeof proc !== "function") {
				throw new Error(`Procedure não é callable: ${path}`);
			}

			const type = proc._def.type;
			if (type === "subscription") {
				throw new Error(`Subscriptions não são suportadas pelo CLI: ${path}`);
			}

			const result = await proc({
				ctx: context,
				input,
				path,
				type,
				getRawInput: async () => input,
				signal: undefined,
			});

			if (!serializeOutput) return result;
			const transformer = getOutputTransformer(router);
			return transformer ? transformer.serialize(result) : result;
		},
	};
}

export const trpcAdapter = buildTrpcAdapter(false);

export function defineTrpcConfig<TRouter extends AnyTRPCRouter>(config: {
	router: TRouter;
	context: (
		args: AgentApiContextArgs,
	) => inferRouterContext<TRouter> | Promise<inferRouterContext<TRouter>>;
	serializeOutput?: boolean;
}): AgentApiConfig<TRouter, inferRouterContext<TRouter>> {
	const adapter = buildTrpcAdapter(config.serializeOutput ?? false);
	return {
		adapter: adapter as RpcAdapter<TRouter, inferRouterContext<TRouter>>,
		router: config.router,
		context: config.context,
	};
}
