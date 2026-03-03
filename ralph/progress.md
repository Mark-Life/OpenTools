# Ralph Build Progress

## Codebase Notes

- Monorepo: Turborepo + Bun
- apps/web on port 3000 (do not touch)
- packages/ui = shared shadcn components (do not touch)
- packages/typescript-config = shared tsconfig (do not touch)
- All packages: type: "module", workspace:* refs
- Biome enforced via Ultracite: use `interface` for objects, `type` for unions
- next.config.ts pattern: transpilePackages, reactCompiler, typedRoutes

## Completed Stories

- SPEC-1: @opentools/spec scaffolded
  - Use `.js` extensions in relative imports (NodeNext moduleResolution)
  - Biome sorts interface members alphabetically — don't fight it
  - Package exports map subpaths directly to `./src/*.ts`
  - tsconfig extends `@workspace/typescript-config/base.json` with `outDir: ./dist`, `include: ["src"]`

- ORPC-1: @opentools/orpc scaffolded
  - Uses `@opentools/spec` subpath imports (e.g. `@opentools/spec/types`, `@opentools/spec/constants`)
  - peerDeps for `@orpc/server` and `@orpc/openapi` — no actual runtime dep on them
  - `xlm()` returns `{ "x-llm": XLlmOperation }` for spreading into oRPC route spec callbacks
  - `withXLlm()` injects root `x-llm` with SPEC_VERSION into OpenAPI doc
  - `createDiscoveryResponse()` uses `Response.json()` (Biome enforces over `new Response(JSON.stringify(...))`)
  - Biome auto-formats single-param arrow fns to inline params (no wrapping parens on separate line)

- AISDK-1: @opentools/ai-sdk discovery + spec-parser
  - `discoverLlm(baseUrl)` fetches `/.well-known/llm.json`, returns `LlmDiscovery`
  - `parseSpec(specUrl)` fetches OpenAPI spec, extracts `x-llm` root + `ParsedOperation[]`
  - Biome cognitive complexity limit is 20 — break complex functions into small helpers (collectParams, mergeBodySchema, buildSchema, etc.)
  - Package exports: `./discovery`, `./spec-parser` (more will be added in AISDK-2)

- AISDK-2: @opentools/ai-sdk tool-generator + client entry
  - `operationsToTools(operations, opts)` returns `{ tools, metadata }` using AI SDK `tool()` + `jsonSchema()`
  - `jsonSchema()` returns `Schema<unknown>` — execute args type is `unknown`, needs cast to `Record<string, unknown>`
  - `tool()` return type uses overloads; use `Record<string, Tool>` (not `ReturnType<typeof tool>`) for the tools record
  - `ToolMetadata` must be exported (not just interface) so `client.ts` can reference it in inferred return type
  - Biome enforces spaces (not tabs), sorted imports (scoped packages before bare specifiers)
  - `createToolsFromUrl(baseUrl, opts)` composes discovery → parseSpec → operationsToTools
  - Package exports now: `./client`, `./discovery`, `./spec-parser`, `./tool-generator`
  - `ai@^4` installed (v4.3.19) — `tool()` and `jsonSchema()` available from main `ai` export

- TASKS-1: apps/tasks scaffolded (Next.js + schemas + store)
  - Next.js app at `apps/tasks`, port 3001 via `--port` flag in dev script
  - Mirrors `apps/web` pattern: next.config.ts, tsconfig.json, postcss.config.mjs, layout.tsx
  - `lib/schemas.ts`: Zod schemas for Task, CreateTaskInput, UpdateTaskInput; status is `"todo" | "in-progress" | "done"`
  - `lib/store.ts`: in-memory Map + CRUD helpers (listTasks, getTask, createTask, updateTask, deleteTask), 3 seeded tasks
  - Zod schema and inferred type share same name (e.g. `export const Task = z.object(...)` + `export type Task = z.infer<typeof Task>`)
  - `postcss.config.mjs` re-exports from `@workspace/ui/postcss.config`

- TASKS-2: oRPC router with 5 procedures + x-llm
  - `lib/router.ts`: exports `router` object with 5 named procedures (listTasks, getTask, createTask, updateTask, deleteTask)
  - oRPC `spec` callback is a real feature: `spec: (s) => ({ ...s, ...xlm({...}) })` — merges x-llm into auto-generated OpenAPI operation
  - Import aliases needed to avoid name collisions: `createTask as createTaskFn` etc. (procedure names match store function names)
  - Biome sorts scoped package imports (`@opentools/*`, `@orpc/*`) before bare specifiers (`zod`), then `@/` path aliases last

- TASKS-3: API routes (catch-all, openapi.json, well-known)
  - `app/api/[...rest]/route.ts`: `OpenAPIHandler` from `@orpc/openapi/fetch`, `ZodSmartCoercionPlugin` from `@orpc/zod` as plugin
  - `OpenAPIHandler` does NOT accept `schemaConverters` — only `plugins` (unlike `OpenAPIGenerator`)
  - `OpenAPIGenerator` from `@orpc/openapi` accepts `schemaConverters: [new ZodToJsonSchemaConverter()]` for spec generation
  - `app/openapi.json/route.ts`: generates spec via `OpenAPIGenerator.generate(router, { info })`, then wraps with `withXLlm()`
  - `app/.well-known/llm.json/route.ts`: returns `createDiscoveryResponse({ openapiPath, auth })`
  - Handler `.handle(request)` returns `{ matched, response }` — Next.js route just delegates directly

- TASKS-4: Tasks web UI components
  - `app/page.tsx`: client component fetching `/api/tasks`, renders Card/Badge/Button from `@workspace/ui`
  - `components/providers.tsx`: minimal Providers wrapper (no ThemeProvider yet, just a passthrough)
  - Biome enforces `useDefaultSwitchClause` — always add `default` case even for exhaustive switches
  - Biome enforces single-line Badge children when short enough
  - Layout updated to wrap children with `<Providers>`

- CHAT-1: apps/chat scaffolded (Next.js + connections + deps)
  - Next.js app at `apps/chat`, port 3002 via `--port` flag in dev script
  - Mirrors `apps/tasks` pattern: next.config.ts, tsconfig.json, postcss.config.mjs, layout.tsx, providers.tsx
  - `lib/connections.ts`: in-memory Map + CRUD helpers (listConnections, getConnection, createConnection, updateConnection, deleteConnection)
  - Connection = `{ id, baseUrl, apiKey, name }` — Biome sorts interface members alphabetically
  - Deps: ai, @ai-sdk/anthropic, @ai-sdk/react, @opentools/ai-sdk workspace:*, @workspace/ui, next, react, react-dom
  - Biome auto-fixes: block statements required for if-return, CSS class sorting in JSX

- CHAT-2: Chat API route + settings page
  - `lib/tools.ts`: `loadAllTools(connections)` composes `createToolsFromUrl` per connection, merges tools/metadata
  - Biome: don't use `async` on map callbacks that just return a promise (no `await` inside) — triggers `useAwait`
  - `app/api/chat/route.ts`: POST handler with `streamText`, `anthropic("claude-sonnet-4-20250514")`, tools from connections
  - Cast `messages` and `tools` via `as Parameters<typeof streamText>[0]["messages"]` to satisfy AI SDK overloads
  - `app/api/connections/route.ts`: GET lists, POST creates (delegates to `lib/connections.ts`)
  - `app/settings/page.tsx`: client component with connect form (name, baseUrl, apiKey) + connection list with disconnect
  - Biome: sorts JSX attributes alphabetically; use `!(a && b)` not `!a || !b` for simplified logic

- CHAT-3: Chat UI with messages + tool approval
  - `app/page.tsx`: renders `ChatInterface` component (server component importing client component)
  - `components/chat-interface.tsx`: uses `useChat` from `@ai-sdk/react` with message parts rendering
  - `components/tool-approval.tsx`: approve/deny UI for per-call tools, destructive warnings based on tool name
  - `UIMessage` and `ToolInvocation` types exported from `ai` package (re-exported from `@ai-sdk/ui-utils`)
  - `addToolResult` on useChat is the approval mechanism — passes `{ approved: true }` or `{ approved: false, error }` as tool result
  - Message parts API: iterate `message.parts` for `text`, `tool-invocation` types; `toolInvocation.state` is `partial-call`, `call`, or `result`
  - Biome auto-sorts imports: `@ai-sdk/*` before `@workspace/*` before `ai` before relative

- INTEG-1: Full build verification
  - `.js` relative imports in packages break Turbopack build — use self-referencing package imports instead (e.g. `@opentools/ai-sdk/discovery` instead of `./discovery.js`)
  - Self-referencing imports require `rootDir: "./src"` in package tsconfig for TypeScript NodeNext resolution
  - `transpilePackages` in next.config.ts needed for workspace packages with `.js` imports consumed by Next.js apps
  - `OpenAPIHandler.handle()` returns `{ matched, response }` — Next.js route handlers must extract `.response` to return bare `Response`
  - Next.js 16 build typecheck is stricter than `tsc --noEmit` — validates route handler return types against `RouteHandlerConfig`
