import { describe, expect, test } from "bun:test";
import { trpcCompatConfig, trpcCompatSerializedConfig } from "./fixtures/trpc.compat.ts";

describe("trpc adapter", () => {
	test("list retorna paths ordenados incluindo routers aninhados", async () => {
		await expect(await trpcCompatConfig.adapter.list(trpcCompatConfig.router)).toEqual([
			"combo",
			"echo",
			"echoArk",
			"nested.whoami",
			"ping",
			"ticks",
			"today",
		]);
	});

	test("describe retorna tipo, meta e schema de input", async () => {
		const meta = await trpcCompatConfig.adapter.describe(trpcCompatConfig.router, "echo");

		expect(meta).toMatchObject({
			path: "echo",
			type: "query",
			meta: { public: true },
			input: {
				vendor: "zod",
				jsonSchema: {
					properties: { text: { type: "string" } },
					required: ["text"],
				},
			},
		});
	});

	test("describe retorna null para path inexistente", async () => {
		expect(await trpcCompatConfig.adapter.describe(trpcCompatConfig.router, "missing")).toBeNull();
	});

	test("describe combina múltiplos input parsers em allOf", async () => {
		const meta = await trpcCompatConfig.adapter.describe(trpcCompatConfig.router, "combo");

		expect(meta?.input).toMatchObject({
			vendor: "trpc",
			jsonSchema: {
				allOf: [
					{ properties: { tenantId: { type: "string" } }, required: ["tenantId"] },
					{ properties: { id: { type: "string" } }, required: ["id"] },
				],
			},
		});
		expect(meta?.input?.schemas).toHaveLength(2);
	});

	test("call executa procedure com context", async () => {
		await expect(
			trpcCompatConfig.adapter.call(
				trpcCompatConfig.router,
				"nested.whoami",
				undefined,
				{ user: { id: "test", email: "alice@test.io" } },
			),
		).resolves.toEqual({ id: "test", email: "alice@test.io" });
	});

	test("call falha claramente para path inexistente", async () => {
		await expect(
			trpcCompatConfig.adapter.call(trpcCompatConfig.router, "missing", undefined, {
				user: null,
			}),
		).rejects.toThrow("Procedure não é callable");
	});

	test("call rejeita subscription", async () => {
		await expect(
			trpcCompatConfig.adapter.call(trpcCompatConfig.router, "ticks", undefined, {
				user: null,
			}),
		).rejects.toThrow("Subscriptions não são suportadas");
	});

	test("serializeOutput aplica transformer de saída quando habilitado", async () => {
		const result = await trpcCompatSerializedConfig.adapter.call(
			trpcCompatSerializedConfig.router,
			"today",
			undefined,
			{ user: null },
		);

		expect(result).toMatchObject({
			json: { now: "2026-01-01T00:00:00.000Z" },
			meta: { values: { now: ["Date"] } },
		});
	});
});
