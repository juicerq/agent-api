import { defineConfig } from "../../src/index.ts";
import { testRouter } from "./router.ts";

export default defineConfig({
	router: testRouter,
	context: ({ as }) => ({
		user: as ? { id: "test", email: as } : null,
	}),
});
