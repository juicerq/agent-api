import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadConfig } from "../src/loadConfig.ts";

const REPO_ROOT = resolve(import.meta.dir, "..");

const VALID_CONFIG = `
import { defineConfig } from "${REPO_ROOT}/src/index.ts";
export default defineConfig({
	router: {},
	context: () => ({}),
});
`;

async function scratch() {
	return await mkdtemp(join(tmpdir(), "agent-api-cfg-"));
}

describe("loadConfig", () => {
	test("walk-up encontra config em ancestral", async () => {
		const root = await scratch();
		const nested = join(root, "a/b/c");
		await mkdir(nested, { recursive: true });
		await writeFile(join(root, "agent-api.config.ts"), VALID_CONFIG);

		const { path, config } = await loadConfig(nested);
		expect(path).toBe(join(root, "agent-api.config.ts"));
		expect(config).toHaveProperty("router");
		expect(config).toHaveProperty("context");
	});

	test("--config absoluto ignora walk-up", async () => {
		const root = await scratch();
		const custom = join(root, "custom.config.ts");
		await writeFile(custom, VALID_CONFIG);

		const { path } = await loadConfig("/tmp", custom);
		expect(path).toBe(custom);
	});

	test("--config relativo resolve contra cwd", async () => {
		const root = await scratch();
		await writeFile(join(root, "my.config.ts"), VALID_CONFIG);

		const { path } = await loadConfig(root, "./my.config.ts");
		expect(path).toBe(join(root, "my.config.ts"));
	});

	test("erro claro quando --config aponta pra arquivo inexistente", async () => {
		expect(loadConfig("/tmp", "/does/not/exist/config.ts")).rejects.toThrow(
			/Config não encontrado/,
		);
	});

	test("erro quando default export não tem router+context", async () => {
		const root = await scratch();
		await writeFile(join(root, "agent-api.config.ts"), "export default { foo: 1 };");

		expect(loadConfig(root)).rejects.toThrow(/não exporta default válido/);
	});
});
