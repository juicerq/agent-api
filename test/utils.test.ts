import { describe, expect, test } from "bun:test";
import { formatError, formatJson } from "../src/util/output.ts";

describe("formatJson", () => {
	test("pretty indenta com 2 espaços", () => {
		expect(formatJson({ a: 1 }, true)).toBe('{\n  "a": 1\n}');
	});

	test("compact sem whitespace", () => {
		expect(formatJson({ a: 1 }, false)).toBe('{"a":1}');
	});
});

describe("formatError", () => {
	test("Error preserva name e message", () => {
		const parsed = JSON.parse(formatError(new TypeError("falhou")));
		expect(parsed.name).toBe("TypeError");
		expect(parsed.message).toBe("falhou");
	});

	test("Error com props extras preserva fields", () => {
		const err = Object.assign(new Error("boom"), { code: "X", data: { n: 1 } });
		const parsed = JSON.parse(formatError(err));
		expect(parsed.code).toBe("X");
		expect(parsed.data).toEqual({ n: 1 });
	});

	test("valor não-Error vira JSON puro", () => {
		expect(JSON.parse(formatError("str"))).toBe("str");
		expect(JSON.parse(formatError({ x: 1 }))).toEqual({ x: 1 });
	});
});
