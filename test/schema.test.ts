import { describe, expect, test } from "bun:test";
import { describeSchema } from "../src/util/schema.ts";

describe("describeSchema", () => {
	test("objeto sem ~standard e sem toJsonSchema vira opaco", () => {
		expect(describeSchema({})).toEqual({
			vendor: "desconhecido",
			note: "introspeção JSON Schema indisponível",
		});
	});

	test("null/undefined/primitive retornam opaco", () => {
		expect(describeSchema(null).vendor).toBe("desconhecido");
		expect(describeSchema(undefined).vendor).toBe("desconhecido");
		expect(describeSchema("str").vendor).toBe("desconhecido");
	});

	test("schema callable (função) com ~standard extrai vendor e jsonSchema", () => {
		const schema = Object.assign(() => null, {
			"~standard": { vendor: "arktype", version: 1 },
			toJsonSchema: () => ({ type: "object", properties: { x: { type: "string" } } }),
		});
		const result = describeSchema(schema);
		expect(result.vendor).toBe("arktype");
		expect(result.jsonSchema).toEqual({
			type: "object",
			properties: { x: { type: "string" } },
		});
	});

	test("schema objeto com toJSONSchema (Zod v4) extrai jsonSchema", () => {
		const schema = {
			"~standard": { vendor: "zod", version: 1 },
			toJSONSchema: () => ({ type: "number" }),
		};
		const result = describeSchema(schema);
		expect(result.vendor).toBe("zod");
		expect(result.jsonSchema).toEqual({ type: "number" });
	});

	test("toJsonSchema lançando exception retorna fallback sem jsonSchema", () => {
		const schema = Object.assign(() => null, {
			"~standard": { vendor: "arktype" },
			toJsonSchema: () => {
				throw new Error("boom");
			},
		});
		const result = describeSchema(schema);
		expect(result.vendor).toBe("arktype");
		expect(result.jsonSchema).toBeUndefined();
		expect(result.note).toBe("introspeção JSON Schema indisponível");
	});
});
