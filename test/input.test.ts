import { describe, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveInput } from "../src/util/input.ts";

describe("resolveInput", () => {
	test("parseia --input inline", async () => {
		expect(await resolveInput({ input: '{"a":1}' })).toEqual({ a: 1 });
	});

	test("parseia --input-file do disco", async () => {
		const path = join(tmpdir(), `agent-api-input-${crypto.randomUUID()}.json`);
		await Bun.write(path, '{"b":2}');
		expect(await resolveInput({ inputFile: path })).toEqual({ b: 2 });
	});

	test("sem flags retorna undefined", async () => {
		expect(await resolveInput({})).toBeUndefined();
	});

	test("string vazia ou whitespace retorna undefined", async () => {
		expect(await resolveInput({ input: "" })).toBeUndefined();
		expect(await resolveInput({ input: "   \n  " })).toBeUndefined();
	});

	test("JSON inválido lança com source no erro", async () => {
		expect(resolveInput({ input: "{broken" })).rejects.toThrow(/JSON inválido em --input/);
	});

	test("JSON inválido em arquivo cita o path", async () => {
		const path = join(tmpdir(), `agent-api-bad-${crypto.randomUUID()}.json`);
		await Bun.write(path, "{not json");
		expect(resolveInput({ inputFile: path })).rejects.toThrow(
			new RegExp(`JSON inválido em ${path.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`),
		);
	});
});
