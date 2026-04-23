export function formatJson(value: unknown, pretty: boolean) {
	return JSON.stringify(value ?? null, jsonReplacer, pretty ? 2 : undefined);
}

export function formatError(err: unknown) {
	if (err instanceof Error) {
		const extra = err as unknown as Record<string, unknown>;
		return JSON.stringify({ name: err.name, message: err.message, ...extra }, jsonReplacer, 2);
	}
	return JSON.stringify(err ?? null, jsonReplacer, 2);
}

function jsonReplacer(_key: string, value: unknown) {
	if (typeof value === "bigint") return value.toString();
	return value;
}
