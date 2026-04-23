import type { AgentApiConfig } from "../index.ts";

export async function listCommand(config: AgentApiConfig, filter?: string) {
	const paths = await config.adapter.list(config.router);
	const filtered = filter ? paths.filter((p) => p.includes(filter)) : paths;
	for (const path of filtered) console.log(path);
}
