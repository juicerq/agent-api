import { describe, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CLI = resolve(import.meta.dir, "../src/cli.ts");
const CONFIG = resolve(import.meta.dir, "fixtures/agent-api.config.ts");

async function run(args: string[], stdin?: string) {
	const proc = Bun.spawn(["bun", CLI, "--config", CONFIG, ...args], {
		stdin: stdin !== undefined ? "pipe" : "ignore",
		stdout: "pipe",
		stderr: "pipe",
	});

	if (stdin !== undefined && proc.stdin) {
		proc.stdin.write(stdin);
		await proc.stdin.end();
	}

	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	const exitCode = await proc.exited;

	return { stdout, stderr, exitCode };
}

describe("list", () => {
	test("lista procedures ordenadas", async () => {
		const { stdout, exitCode } = await run(["list"]);
		expect(exitCode).toBe(0);
		expect(stdout.trim().split("\n")).toEqual(["echo", "nested.whoami", "ping"]);
	});

	test("filtra por substring", async () => {
		const { stdout } = await run(["list", "nest"]);
		expect(stdout.trim()).toBe("nested.whoami");
	});
});

describe("show", () => {
	test("retorna metadata com schema introspection", async () => {
		const { stdout, exitCode } = await run(["show", "echo"]);
		expect(exitCode).toBe(0);
		const parsed = JSON.parse(stdout);
		expect(parsed.path).toBe("echo");
		expect(parsed.input.vendor).toBe("zod");
		expect(parsed.input.jsonSchema).toBeDefined();
	});

	test("erro com mensagem pt-br quando procedure não existe", async () => {
		const { stderr, exitCode } = await run(["show", "nao.existe"]);
		expect(exitCode).toBe(1);
		expect(stderr).toInclude("Procedure não encontrada");
	});
});

describe("call", () => {
	test("invoca procedure sem input", async () => {
		const { stdout, exitCode } = await run(["call", "ping"]);
		expect(exitCode).toBe(0);
		expect(stdout.trim()).toBe('"pong"');
	});

	test("--input inline parseia JSON", async () => {
		const { stdout } = await run(["call", "echo", "--input", '{"text":"hi"}']);
		expect(JSON.parse(stdout)).toEqual({ said: "hi" });
	});

	test("--input-file lê payload do disco", async () => {
		const path = join(tmpdir(), `agent-api-cli-${crypto.randomUUID()}.json`);
		await Bun.write(path, '{"text":"from-file"}');
		const { stdout } = await run(["call", "echo", "--input-file", path]);
		expect(JSON.parse(stdout)).toEqual({ said: "from-file" });
	});

	test("- lê input do stdin", async () => {
		const { stdout } = await run(["call", "echo", "-"], '{"text":"from-stdin"}');
		expect(JSON.parse(stdout)).toEqual({ said: "from-stdin" });
	});

	test("--as passa identificador pro context factory", async () => {
		const { stdout } = await run(["call", "nested.whoami", "--as", "alice@test.io"]);
		expect(JSON.parse(stdout)).toEqual({ id: "test", email: "alice@test.io" });
	});

	test("sem --as context retorna anonymous", async () => {
		const { stdout } = await run(["call", "nested.whoami"]);
		expect(stdout.trim()).toBe("null");
	});

	test("--pretty indenta output com 2 espaços", async () => {
		const { stdout } = await run(["call", "echo", "--input", '{"text":"x"}', "--pretty"]);
		expect(stdout).toContain('\n  "said":');
	});

	test("erro quando path não é callable", async () => {
		const { stderr, exitCode } = await run(["call", "nao.existe"]);
		expect(exitCode).toBe(1);
		expect(stderr).toInclude("Procedure não é callable");
	});
});

describe("error paths", () => {
	test("flag desconhecida falha com mensagem pt-br", async () => {
		const { stderr, exitCode } = await run(["list", "--xxx"]);
		expect(exitCode).toBe(1);
		expect(stderr).toInclude("Flag desconhecida");
	});

	test("sem argumento no call sai com erro", async () => {
		const { stderr, exitCode } = await run(["call"]);
		expect(exitCode).toBe(1);
		expect(stderr).toInclude("Uso: agent-api call");
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
