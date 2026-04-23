import { defineOrpcConfig } from "../../src/adapters/orpc.ts";
import { orpcRouter } from "./orpc.router.ts";

export default defineOrpcConfig({
	router: orpcRouter,
	context: ({ as }) => ({
		user: as ? { id: "test", email: as } : null,
	}),
});
