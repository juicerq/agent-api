import type { AnyRouter } from "@orpc/server";
import { resolveContractProcedures } from "@orpc/server";
import { formatJson } from "../util/output.ts";

interface ProcedureDef {
	route?: Record<string, unknown>;
	meta?: Record<string, unknown>;
	inputSchema?: unknown;
	outputSchema?: unknown;
	errorMap?: Record<string, unknown>;
}

interface Entry {
	contract: { "~orpc": ProcedureDef };
	path: readonly string[];
}

export async function showCommand(router: AnyRouter, path: string, pretty: boolean) {
	const entry = await findEntry(router, path);
	if (!entry) throw new Error(`Procedure não encontrada: ${path}`);

	const def = entry.contract["~orpc"];

	const summary = {
		path: entry.path.join("."),
		route: def.route ?? null,
		meta: def.meta ?? null,
		errors: def.errorMap ? Object.keys(def.errorMap) : [],
		input: def.inputSchema ? describeSchema(def.inputSchema) : null,
		output: def.outputSchema ? describeSchema(def.outputSchema) : null,
	};

	console.log(formatJson(summary, pretty));
}

async function findEntry(router: AnyRouter, target: string) {
	const matches: Entry[] = [];

	await resolveContractProcedures({ router, path: [] }, (options) => {
		if (options.path.join(".") === target) matches.push(options as unknown as Entry);
	});

	return matches[0] ?? null;
}

function describeSchema(schema: unknown) {
	if (!schema || typeof schema !== "object") return { note: "schema opaco" };

	const std = (schema as { "~standard"?: { vendor?: unknown } })["~standard"];
	const vendor = typeof std?.vendor === "string" ? std.vendor : "desconhecido";

	for (const method of ["toJSONSchema", "toJsonSchema"] as const) {
		const fn = (schema as Record<string, unknown>)[method];
		if (typeof fn !== "function") continue;
		try {
			return { vendor, jsonSchema: (fn as () => unknown).call(schema) };
		} catch {}
	}

	return { vendor, note: "introspeção JSON Schema indisponível" };
}
