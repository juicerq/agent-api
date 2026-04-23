import { defineTrpcConfig } from "../../src/adapters/trpc.ts";
import { trpcSerializeRouter } from "./trpc.serialize.router.ts";

export default defineTrpcConfig({
	router: trpcSerializeRouter,
	context: () => ({ user: null }),
	serializeOutput: true,
});
