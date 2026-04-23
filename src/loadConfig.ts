import { dirname, isAbsolute, resolve } from "node:path";
import type { AgentApiConfig } from "./index.ts";

const CONFIG_FILENAME = "agent-api.config.ts";

export async function loadConfig(cwd: string, configFlag?: string) {
	const path = await resolvePath(cwd, configFlag);
	const mod = (await import(path)) as { default?: unknown };

	if (!isConfig(mod.default)) {
		throw new Error(
			`${path} não exporta default válido. Use \`export default defineOrpcConfig({...})\` ou \`defineTrpcConfig({...})\`.`,
		);
	}

	return { path, config: mod.default };
}

async function resolvePath(cwd: string, configFlag?: string) {
	if (configFlag) {
		const path = isAbsolute(configFlag) ? configFlag : resolve(cwd, configFlag);
		if (!(await Bun.file(path).exists())) throw new Error(`Config não encontrado: ${path}`);
		return path;
	}

	const found = await walkUp(cwd);
	if (!found) {
		throw new Error(`${CONFIG_FILENAME} não encontrado a partir de ${cwd}. Use --config <path>.`);
	}
	return found;
}

async function walkUp(cwd: string) {
	let dir = cwd;
	while (true) {
		const candidate = resolve(dir, CONFIG_FILENAME);
		if (await Bun.file(candidate).exists()) return candidate;
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

function isConfig(value: unknown): value is AgentApiConfig {
	if (!value || typeof value !== "object") return false;
	const obj = value as Record<string, unknown>;
	return "adapter" in obj && "router" in obj && "context" in obj;
}
