import { os } from "@orpc/server";
import { type } from "arktype";
import { z } from "zod";
import { defineOrpcConfig } from "../../src/adapters/orpc.ts";

type Ctx = { user: { id: string; email: string } | null };

const base = os.$context<Ctx>();

export const orpcCompatRouter = {
	ping: base.handler(() => "pong"),
	echo: base
		.route({ method: "POST", path: "/echo" })
		.meta({ public: true })
		.input(z.object({ text: z.string() }))
		.output(z.object({ said: z.string() }))
		.errors({ BAD_INPUT: {} })
		.handler(({ input }) => ({ said: input.text })),
	echoArk: base
		.input(type({ text: "string" }))
		.handler(({ input }) => ({ said: input.text })),
	nested: {
		whoami: base.handler(({ context }) => context.user),
	},
};

export const orpcCompatConfig = defineOrpcConfig({
	router: orpcCompatRouter,
	context: ({ as }) => ({
		user: as ? { id: "test", email: as } : null,
	}),
});
