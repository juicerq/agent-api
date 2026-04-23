import type { AnyRouter } from "@orpc/server";
import { createRouterClient } from "@orpc/server";
import type { AgentApiConfig } from "../index.ts";
import { formatJson } from "../util/output.ts";
import { walkDottedPath } from "../util/resolveProcedure.ts";

export interface CallOptions {
	path: string;
	input: unknown;
	as?: string;
	pretty: boolean;
}

export async function callCommand(
	config: AgentApiConfig<AnyRouter>,
	options: CallOptions,
) {
	const context = await config.context({ as: options.as });
	const client = createRouterClient(config.router, { context });

	const target = walkDottedPath(client, options.path);

	if (typeof target !== "function") {
		throw new Error(`Procedure não é callable: ${options.path}`);
	}

	const procedure = target as (input?: unknown) => Promise<unknown>;
	const result = await procedure(options.input);

	console.log(formatJson(result, options.pretty));
}
