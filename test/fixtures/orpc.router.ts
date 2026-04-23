import { os } from "@orpc/server";
import { type } from "arktype";
import { z } from "zod";

type Ctx = { user: { id: string; email: string } | null };

const base = os.$context<Ctx>();

export const orpcRouter = {
	ping: base.handler(() => "pong"),
	echo: base.input(z.object({ text: z.string() })).handler(({ input }) => ({ said: input.text })),
	echoArk: base
		.input(type({ text: "string" }))
		.handler(({ input }) => ({ said: input.text })),
	nested: {
		whoami: base.handler(({ context }) => context.user),
	},
};
