import { defineTrpcConfig } from "../../src/adapters/trpc.ts";
import { trpcRouter } from "./trpc.router.ts";

export default defineTrpcConfig({
	router: trpcRouter,
	context: ({ as }) => ({
		user: as ? { id: "test", email: as } : null,
	}),
});
