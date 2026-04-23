import type { AgentApiConfig } from "../index.ts";
import { formatJson } from "../util/output.ts";

export interface CallOptions {
	path: string;
	input: unknown;
	as?: string;
	pretty: boolean;
}

export async function callCommand(config: AgentApiConfig, options: CallOptions) {
	const context = await config.context({ as: options.as });
	const result = await config.adapter.call(config.router, options.path, options.input, context);
	console.log(formatJson(result, options.pretty));
}
