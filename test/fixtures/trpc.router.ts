import { initTRPC } from "@trpc/server";
import { type } from "arktype";
import { z } from "zod";

type Ctx = { user: { id: string; email: string } | null };

const t = initTRPC.context<Ctx>().create();

export const trpcRouter = t.router({
	ping: t.procedure.query(() => "pong"),
	echo: t.procedure
		.input(z.object({ text: z.string() }))
		.query(({ input }) => ({ said: input.text })),
	echoArk: t.procedure
		.input(type({ text: "string" }))
		.query(({ input }) => ({ said: input.text })),
	nested: t.router({
		whoami: t.procedure.query(({ ctx }) => ctx.user),
	}),
});
