import { initTRPC } from "@trpc/server";
import superjson from "superjson";

type Ctx = { user: { id: string; email: string } | null };

const t = initTRPC.context<Ctx>().create({ transformer: superjson });

export const trpcSerializeRouter = t.router({
	today: t.procedure.query(() => ({ now: new Date("2026-01-01T00:00:00Z") })),
});
