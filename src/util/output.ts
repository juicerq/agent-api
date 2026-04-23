export function formatJson(value: unknown, pretty: boolean) {
	return JSON.stringify(value, null, pretty ? 2 : undefined);
}

export function formatError(err: unknown) {
	if (err instanceof Error) {
		const extra = err as unknown as Record<string, unknown>;
		return JSON.stringify({ name: err.name, message: err.message, ...extra }, null, 2);
	}
	return JSON.stringify(err, null, 2);
}
