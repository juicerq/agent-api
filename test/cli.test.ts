import { describe, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CLI = resolve(import.meta.dir, "../src/cli.ts");

const FIXTURES = [
	{ name: "orpc", config: resolve(import.meta.dir, "fixtures/orpc.config.ts") },
	{ name: "trpc", config: resolve(import.meta.dir, "fixtures/trpc.config.ts") },
];

async function run(configPath: string, args: string[], stdin?: string) {
	const proc = Bun.spawn(["bun", CLI, "--config", configPath, ...args], {
		stdin: stdin !== undefined ? new Response(stdin) : "ignore",
		stdout: "pipe",
		stderr: "pipe",
	});

	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	const exitCode = await proc.exited;

	return { stdout, stderr, exitCode };
}

describe.each(FIXTURES)("$name adapter", ({ config: CONFIG }) => {
	describe("list", () => {
		test("lista procedures ordenadas", async () => {
			const { stdout, exitCode } = await run(CONFIG, ["list"]);
			expect(exitCode).toBe(0);
			expect(stdout.trim().split("\n")).toEqual(["echo", "echoArk", "nested.whoami", "ping"]);
		});

		test("filtra por substring", async () => {
			const { stdout } = await run(CONFIG, ["list", "nest"]);
			expect(stdout.trim()).toBe("nested.whoami");
		});
	});

	describe("show", () => {
		test("retorna metadata com schema introspection", async () => {
			const { stdout, exitCode } = await run(CONFIG, ["show", "echo"]);
			expect(exitCode).toBe(0);
			const parsed = JSON.parse(stdout);
			expect(parsed.path).toBe("echo");
			expect(parsed.input.vendor).toBe("zod");
			expect(parsed.input.jsonSchema).toBeDefined();
		});

		test("arktype é reconhecido (schema callable)", async () => {
			const { stdout, exitCode } = await run(CONFIG, ["show", "echoArk"]);
			expect(exitCode).toBe(0);
			const parsed = JSON.parse(stdout);
			expect(parsed.input.vendor).toBe("arktype");
			expect(parsed.input.jsonSchema).toMatchObject({
				type: "object",
				properties: { text: { type: "string" } },
			});
		});

		test("erro com mensagem pt-br quando procedure não existe", async () => {
			const { stderr, exitCode } = await run(CONFIG, ["show", "nao.existe"]);
			expect(exitCode).toBe(1);
			expect(stderr).toInclude("Procedure não encontrada");
		});
	});

	describe("call", () => {
		test("invoca procedure sem input", async () => {
			const { stdout, exitCode } = await run(CONFIG, ["call", "ping"]);
			expect(exitCode).toBe(0);
			expect(stdout.trim()).toBe('"pong"');
		});

		test("--input inline parseia JSON", async () => {
			const { stdout } = await run(CONFIG, ["call", "echo", "--input", '{"text":"hi"}']);
			expect(JSON.parse(stdout)).toEqual({ said: "hi" });
		});

		test("call funciona com procedure usando schema arktype", async () => {
			const { stdout, exitCode } = await run(CONFIG, [
				"call",
				"echoArk",
				"--input",
				'{"text":"ark"}',
			]);
			expect(exitCode).toBe(0);
			expect(JSON.parse(stdout)).toEqual({ said: "ark" });
		});

		test("--input-file lê payload do disco", async () => {
			const path = join(tmpdir(), `agent-api-cli-${crypto.randomUUID()}.json`);
			await Bun.write(path, '{"text":"from-file"}');
			const { stdout } = await run(CONFIG, ["call", "echo", "--input-file", path]);
			expect(JSON.parse(stdout)).toEqual({ said: "from-file" });
		});

		test("- lê input do stdin", async () => {
			const { stdout } = await run(CONFIG, ["call", "echo", "-"], '{"text":"from-stdin"}');
			expect(JSON.parse(stdout)).toEqual({ said: "from-stdin" });
		});

		test("--as passa identificador pro context factory", async () => {
			const { stdout } = await run(CONFIG, ["call", "nested.whoami", "--as", "alice@test.io"]);
			expect(JSON.parse(stdout)).toEqual({ id: "test", email: "alice@test.io" });
		});

		test("sem --as context retorna anonymous", async () => {
			const { stdout } = await run(CONFIG, ["call", "nested.whoami"]);
			expect(stdout.trim()).toBe("null");
		});

		test("--pretty indenta output com 2 espaços", async () => {
			const { stdout } = await run(CONFIG, ["call", "echo", "--input", '{"text":"x"}', "--pretty"]);
			expect(stdout).toContain('\n  "said":');
		});

		test("erro quando path não é callable", async () => {
			const { stderr, exitCode } = await run(CONFIG, ["call", "nao.existe"]);
			expect(exitCode).toBe(1);
			expect(stderr).toInclude("Procedure não é callable");
		});
	});

	describe("error paths", () => {
		test("processo termina mesmo com handles abertos após call", async () => {
			const proc = Bun.spawn(["bun", CLI, "--config", CONFIG, "call", "ping"], {
				stdout: "pipe",
				stderr: "pipe",
				timeout: 3000,
			});
			const exitCode = await proc.exited;
			expect(exitCode).toBe(0);
		});
	});
});

describe("trpc serializeOutput", () => {
	const CONFIG = resolve(import.meta.dir, "fixtures/trpc.serialize.config.ts");

	test("aplica transformer.output.serialize no resultado", async () => {
		const { stdout, exitCode } = await run(CONFIG, ["call", "today"]);
		expect(exitCode).toBe(0);
		const parsed = JSON.parse(stdout);
		expect(parsed.json.now).toBe("2026-01-01T00:00:00.000Z");
		expect(parsed.meta.values.now).toEqual(["Date"]);
	});
});

describe("cli-level errors", () => {
	const CONFIG = FIXTURES[0]!.config;

	test("flag desconhecida falha com mensagem pt-br", async () => {
		const { stderr, exitCode } = await run(CONFIG, ["list", "--xxx"]);
		expect(exitCode).toBe(1);
		expect(stderr).toInclude("Flag desconhecida");
	});

	test("flag com valor não aceita outra flag como argumento", async () => {
		const { stderr, exitCode } = await run(CONFIG, ["call", "echo", "--input-file", "--pretty"]);
		expect(exitCode).toBe(1);
		expect(stderr).toInclude("--input-file requer argumento");
	});

	test("sem argumento no call sai com erro", async () => {
		const { stderr, exitCode } = await run(CONFIG, ["call"]);
		expect(exitCode).toBe(1);
		expect(stderr).toInclude("Uso: agent-api call");
	});

	test("argumentos posicionais extras falham em vez de serem ignorados", async () => {
		const show = await run(CONFIG, ["show", "ping", "extra"]);
		expect(show.exitCode).toBe(1);
		expect(show.stderr).toInclude("Uso: agent-api show");

		const call = await run(CONFIG, ["call", "ping", "extra"]);
		expect(call.exitCode).toBe(1);
		expect(call.stderr).toInclude("Uso: agent-api call");
	});

	test("sem comando mostra help e sai 1", async () => {
		const proc = Bun.spawn(["bun", CLI], { stdout: "pipe", stderr: "pipe" });
		const stdout = await new Response(proc.stdout).text();
		const exitCode = await proc.exited;
		expect(exitCode).toBe(1);
		expect(stdout).toInclude("agent-api");
		expect(stdout).toInclude("Uso:");
	});

	test("--help sai 0", async () => {
		const proc = Bun.spawn(["bun", CLI, "--help"], { stdout: "pipe", stderr: "pipe" });
		const exitCode = await proc.exited;
		expect(exitCode).toBe(0);
	});
});
