# @juicerq/agent-api

CLI para invocar procedures [oRPC](https://orpc.dev) ou [tRPC](https://trpc.io) in-process. Pensado pra agentes e scripts — sem HTTP, sem auth, com acesso direto ao router.

## Install

```sh
bun add -d @juicerq/agent-api
```

Requer [Bun](https://bun.sh). Instale também o peer do framework que você usa:

```sh
bun add @orpc/server     # pra oRPC
bun add @trpc/server     # pra tRPC v11+
```

## Config

Crie um `agent-api.config.ts` na raiz do projeto (ou em qualquer ancestral do cwd). Use o `defineConfig` do adapter correspondente — o tipo do `context` é inferido do `router`.

### oRPC

```ts
import { defineOrpcConfig } from "@juicerq/agent-api/orpc";
import { eq } from "drizzle-orm";
import { db } from "./src/db/client.ts";
import { appRouter } from "./src/router.ts";
import { users } from "./src/db/schema/users.ts";

export default defineOrpcConfig({
	router: appRouter,
	context: async ({ as }) => {
		if (!as) return { user: null, db };
		const [user] = await db.select().from(users).where(eq(users.email, as)).limit(1);
		return { user: user ?? null, db };
	},
});
```

### tRPC

```ts
import { defineTrpcConfig } from "@juicerq/agent-api/trpc";
import { appRouter } from "./src/router.ts";

export default defineTrpcConfig({
	router: appRouter,
	context: async ({ as }) => ({
		user: as ? await findUser(as) : null,
	}),
});
```

## Comandos

### `list [filter]`

Lista as procedures disponíveis, uma por linha.

```sh
bunx agent-api list
# counter.get
# counter.increment

bunx agent-api list counter
# counter.get
# counter.increment
```

### `show <path>`

Imprime metadata (tipo, meta, errors) e JSON Schema do input/output quando o schema expõe introspecção (Zod 4+, Arktype).

```sh
bunx agent-api show counter.get --pretty
```

### `call <path>`

Invoca a procedure. Input via flag, arquivo, ou stdin.

```sh
bunx agent-api call counter.get
bunx agent-api call counter.set --input '{"value": 42}'
bunx agent-api call counter.set --input-file payload.json
echo '{"value": 42}' | bunx agent-api call counter.set -
bunx agent-api call users.me --as alice@example.com
bunx agent-api call counter.get --pretty
```

Subscriptions do tRPC não são suportadas — use `query`/`mutation`.

## Flags

| Flag              | Comandos       | Descrição                                     |
| ----------------- | -------------- | --------------------------------------------- |
| `--config <path>` | todos          | Path explícito pro config (senão walk-up cwd) |
| `--input <json>`  | `call`         | JSON inline                                   |
| `--input-file`    | `call`         | JSON de arquivo                               |
| `-`               | `call`         | Lê JSON do stdin                              |
| `--as <id>`       | `call`         | Passa `as` pro factory de context             |
| `--pretty`        | `show`, `call` | Indenta output (default: compacto)            |

## Config discovery

Walk-up a partir do cwd procurando `agent-api.config.ts`. Override com `--config <path>` (absoluto ou relativo ao cwd).

## Custom adapters

Pra outros frameworks RPC, implemente a interface `RpcAdapter` de `@juicerq/agent-api` (`list`, `describe`, `call`) e passe no `defineConfig` genérico.
