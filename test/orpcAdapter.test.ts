import { describe, expect, test } from "bun:test";
import { orpcCompatConfig } from "./fixtures/orpc.compat.ts";

describe("orpc adapter", () => {
	test("list retorna paths ordenados incluindo routers aninhados", async () => {
		await expect(orpcCompatConfig.adapter.list(orpcCompatConfig.router)).resolves.toEqual([
			"echo",
			"echoArk",
			"nested.whoami",
			"ping",
		]);
	});

	test("describe retorna route, meta, errors e schemas", async () => {
		const meta = await orpcCompatConfig.adapter.describe(orpcCompatConfig.router, "echo");

		expect(meta).toMatchObject({
			path: "echo",
			route: { method: "POST", path: "/echo" },
			meta: { public: true },
			errors: ["BAD_INPUT"],
			input: {
				vendor: "zod",
				jsonSchema: {
					properties: { text: { type: "string" } },
					required: ["text"],
				},
			},
			output: {
				vendor: "zod",
				jsonSchema: {
					properties: { said: { type: "string" } },
					required: ["said"],
				},
			},
		});
	});

	test("describe retorna null para path inexistente", async () => {
		await expect(
			orpcCompatConfig.adapter.describe(orpcCompatConfig.router, "missing"),
		).resolves.toBeNull();
	});

	test("call executa procedure com input", async () => {
		await expect(
			orpcCompatConfig.adapter.call(
				orpcCompatConfig.router,
				"echo",
				{ text: "hi" },
				{ user: null },
			),
		).resolves.toEqual({ said: "hi" });
	});

	test("call executa procedure com context", async () => {
		await expect(
			orpcCompatConfig.adapter.call(orpcCompatConfig.router, "nested.whoami", undefined, {
				user: { id: "test", email: "alice@test.io" },
			}),
		).resolves.toEqual({ id: "test", email: "alice@test.io" });
	});

	test("call falha claramente para path inexistente", async () => {
		await expect(
			orpcCompatConfig.adapter.call(orpcCompatConfig.router, "missing", undefined, {
				user: null,
			}),
		).rejects.toThrow("Procedure não é callable");
	});
});
