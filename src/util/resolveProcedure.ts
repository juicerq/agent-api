export function walkDottedPath(root: unknown, path: string) {
	const parts = path.split(".");
	let target: unknown = root;

	for (const part of parts) {
		if (target === null || typeof target !== "object") return null;
		target = (target as Record<string, unknown>)[part];
	}

	return target ?? null;
}
