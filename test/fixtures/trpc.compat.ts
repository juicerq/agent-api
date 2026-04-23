import { initTRPC } from "@trpc/server";
import { type } from "arktype";
import superjson from "superjson";
import { z } from "zod";
import { defineTrpcConfig } from "../../src/adapters/trpc.ts";

type Ctx = { user: { id: string; email: string } | null };

const t = initTRPC.context<Ctx>().create({ transformer: superjson });
const authed = t.procedure.input(z.object({ tenantId: z.string() }));

export const trpcCompatRouter = t.router({
	ping: t.procedure.query(() => "pong"),
	echo: t.procedure
		.meta({ public: true })
		.input(z.object({ text: z.string() }))
		.query(({ input }) => ({ said: input.text })),
	echoArk: t.procedure
		.input(type({ text: "string" }))
		.query(({ input }) => ({ said: input.text })),
	combo: authed.input(z.object({ id: z.string() })).mutation(({ input }) => input),
	today: t.procedure.query(() => ({ now: new Date("2026-01-01T00:00:00Z") })),
	ticks: t.procedure.subscription(async function* () {
		yield 1;
	}),
	nested: t.router({
		whoami: t.procedure.query(({ ctx }) => ctx.user),
	}),
});

export const trpcCompatConfig = defineTrpcConfig({
	router: trpcCompatRouter,
	context: ({ as }) => ({
		user: as ? { id: "test", email: as } : null,
	}),
});

export const trpcCompatSerializedConfig = defineTrpcConfig({
	router: trpcCompatRouter,
	context: () => ({ user: null }),
	serializeOutput: true,
});
