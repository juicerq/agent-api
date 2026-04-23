import type { SchemaDescription } from "../adapters/types.ts";

export function describeSchema(schema: unknown): SchemaDescription {
	if (!schema || (typeof schema !== "object" && typeof schema !== "function"))
		return { vendor: "desconhecido", note: "schema opaco" };

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
