import type { AgentApiConfig } from "../index.ts";
import { formatJson } from "../util/output.ts";

export async function showCommand(config: AgentApiConfig, path: string, pretty: boolean) {
	const meta = await config.adapter.describe(config.router, path);
	if (!meta) throw new Error(`Procedure não encontrada: ${path}`);
	console.log(formatJson(meta, pretty));
}
