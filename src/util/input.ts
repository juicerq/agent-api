export interface InputFlags {
	input?: string;
	inputFile?: string;
	stdin?: boolean;
}

interface RawInput {
	content: string;
	source: string;
}

export async function resolveInput(flags: InputFlags) {
	const raw = await readRaw(flags);
	if (!raw) return undefined;

	const trimmed = raw.content.trim();
	if (!trimmed) return undefined;

	try {
		return JSON.parse(trimmed) as unknown;
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		throw new Error(`JSON inválido em ${raw.source}: ${msg}`);
	}
}

async function readRaw(flags: InputFlags): Promise<RawInput | null> {
	if (flags.input !== undefined) return { content: flags.input, source: "--input" };

	if (flags.inputFile !== undefined) {
		return { content: await Bun.file(flags.inputFile).text(), source: flags.inputFile };
	}

	if (flags.stdin) return { content: await Bun.stdin.text(), source: "stdin" };

	return null;
}
