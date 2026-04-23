import type { AnyRouter } from "@orpc/server";
import { resolveContractProcedures } from "@orpc/server";

export async function listCommand(router: AnyRouter, filter?: string) {
	const paths: string[] = [];

	await resolveContractProcedures({ router, path: [] }, ({ path }) => {
		paths.push(path.join("."));
	});

	paths.sort();

	const filtered = filter ? paths.filter((p) => p.includes(filter)) : paths;

	for (const path of filtered) console.log(path);
}
