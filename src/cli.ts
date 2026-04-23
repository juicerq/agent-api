#!/usr/bin/env bun
import { callCommand } from "./commands/call.ts";
import { listCommand } from "./commands/list.ts";
import { showCommand } from "./commands/show.ts";
import { loadConfig } from "./loadConfig.ts";
import { resolveInput } from "./util/input.ts";
import { formatError } from "./util/output.ts";

const FLAGS_WITH_VALUE = new Set(["--input", "--input-file", "--as", "--config"]);
const BOOLEAN_FLAGS = new Set(["--pretty", "--help", "-h"]);

interface Parsed {
	positional: string[];
	flags: Record<string, string>;
	booleans: Set<string>;
}

function parseArgv(argv: string[]): Parsed {
	const positional: string[] = [];
	const flags: Record<string, string> = {};
	const booleans = new Set<string>();

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === undefined) continue;

		if (arg === "-") {
			positional.push("-");
			continue;
		}

		if (FLAGS_WITH_VALUE.has(arg)) {
			const value = argv[++i];
			if (value === undefined || value.startsWith("--")) throw new Error(`${arg} requer argumento`);
			flags[arg] = value;
			continue;
		}

		if (BOOLEAN_FLAGS.has(arg)) {
			booleans.add(arg);
			continue;
		}

		if (arg.startsWith("--")) throw new Error(`Flag desconhecida: ${arg}`);

		positional.push(arg);
	}

	return { positional, flags, booleans };
}

const HELP = `agent-api — CLI para invocar procedures oRPC/tRPC in-process

Uso:
  agent-api list [filter]
  agent-api show <path>
  agent-api call <path> [--input <json>] [--input-file <path>] [-] [--as <id>]

Flags globais:
  --config <path>     Path explícito para agent-api.config.ts (senão walk-up do cwd)
  --pretty            Formata output JSON com indent 2
  -h, --help          Mostra esta ajuda

Exemplo de config (oRPC):
  // agent-api.config.ts
  import { defineOrpcConfig } from "@juicerq/agent-api/orpc";
  import { appRouter } from "./src/router.ts";

  export default defineOrpcConfig({
    router: appRouter,
    context: async ({ as }) => ({ user: null }),
  });

Exemplo de config (tRPC):
  // agent-api.config.ts
  import { defineTrpcConfig } from "@juicerq/agent-api/trpc";
  import { appRouter } from "./src/router.ts";

  export default defineTrpcConfig({
    router: appRouter,
    context: async ({ as }) => ({ user: null }),
  });
`;

async function main() {
	const parsed = parseArgv(process.argv.slice(2));

	const helpRequested = parsed.booleans.has("--help") || parsed.booleans.has("-h");

	if (helpRequested || parsed.positional.length === 0) {
		console.log(HELP);
		process.exit(helpRequested ? 0 : 1);
	}

	const [command, ...rest] = parsed.positional;
	const pretty = parsed.booleans.has("--pretty");
	const { config } = await loadConfig(process.cwd(), parsed.flags["--config"]);

	if (command === "list") {
		if (rest.length > 1) throw new Error("Uso: agent-api list [filter]");
		return listCommand(config, rest[0]);
	}

	if (command === "show") {
		if (rest.length !== 1) throw new Error("Uso: agent-api show <path>");
		return showCommand(config, requirePath(rest[0], "show"), pretty);
	}

	if (command === "call") {
		const [path, ...extra] = rest;
		const unexpected = extra.filter((arg) => arg !== "-");
		if (unexpected.length > 0)
			throw new Error(
				"Uso: agent-api call <path> [--input <json>] [--input-file <path>] [-] [--as <id>]",
			);

		const input = await resolveInput({
			input: parsed.flags["--input"],
			inputFile: parsed.flags["--input-file"],
			stdin: rest.includes("-"),
		});
		return callCommand(config, {
			path: requirePath(path, "call"),
			input,
			as: parsed.flags["--as"],
			pretty,
		});
	}

	throw new Error(`Comando desconhecido: ${command}. Use: list, show, call.`);
}

function requirePath(path: string | undefined, command: string) {
	if (!path) throw new Error(`Uso: agent-api ${command} <path>`);
	return path;
}

try {
	await main();
	process.exit(0);
} catch (err) {
	console.error(formatError(err));
	process.exit(1);
}
