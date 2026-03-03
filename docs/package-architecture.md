# OpenTools Package Library — Architecture

## Two-Sided Design

The library has two sides connected by a shared spec:

- **Provider side**: Server frameworks → OpenAPI + x-llm extensions
- **Consumer side**: OpenAPI + x-llm spec → AI SDK tools

Initial demo pair: oRPC (provider) + Vercel AI SDK (consumer). Future: more adapters for both sides (Hono, FastAPI, LangChain, Mastra, etc.).

## Package Structure

```
packages/
  spec/       → @opentools/spec      (shared types, zero deps)
  orpc/       → @opentools/orpc      (provider adapter, peer deps: @orpc/*)
  ai-sdk/     → @opentools/ai-sdk    (consumer adapter, dep: ai@^6)
```

Dependency graph:

```
@opentools/spec  ← no deps
    ↑       ↑
@opentools/orpc  @opentools/ai-sdk
    ↑                ↑
apps/tasks       apps/chat
```

---

## Package 1: `@opentools/spec`

Shared types + constants. Zero runtime deps.

```
packages/spec/
  package.json         # name: @opentools/spec
  tsconfig.json        # extends typescript-config/base
  src/
    types.ts           # XLlmRoot, XLlmOperation, LlmDiscovery, ParsedOperation, ApprovalLevel
    constants.ts       # WELL_KNOWN_PATH, DEFAULT_APPROVAL, SPEC_VERSION
    validation.ts      # isXLlmOperation(), isXLlmRoot() type guards, resolveApproval()
```

### Key Types

- `XLlmRoot` — root-level x-llm (version, name, description, defaultApproval)
- `XLlmOperation` — operation-level x-llm (enabled, approval, destructive, hint, rateLimit, costIndicator, blanketApprovalAllowed)
- `LlmDiscovery` — shape of `/.well-known/llm.json` (`{ openapi: string, auth: string }`)
- `ParsedOperation` — operationId + method + path + summary + inputSchema (JSON Schema) + xlm metadata
- `ApprovalLevel` — `'auto' | 'per-call'`
- `CostIndicator` — `'free' | 'credits' | 'paid'`

---

## Package 2: `@opentools/orpc`

Provider helpers for oRPC. Thin utilities — oRPC already supports `spec` callback on `.route()`.

```
packages/orpc/
  package.json         # name: @opentools/orpc, peerDeps: @orpc/server, @orpc/openapi
  tsconfig.json
  src/
    metadata.ts        # xlm() — type-safe x-llm builder for route.spec callback
    spec-enhancer.ts   # withXLlm() — wrap OpenAPI doc with root x-llm
    discovery.ts       # createDiscoveryResponse() — serves /.well-known/llm.json
```

### Public API

```ts
// metadata.ts — type-safe builder for x-llm operation metadata
// Returns object ready to spread into oRPC route.spec callback
xlm({ enabled: true, approval: 'per-call', destructive: true })
// → { 'x-llm': { enabled: true, approval: 'per-call', destructive: true } }

// Usage in oRPC:
// .route({
//   method: 'DELETE',
//   path: '/tasks/{id}',
//   spec: s => ({ ...s, ...xlm({ enabled: true, approval: 'per-call', destructive: true }) })
// })
```

```ts
// spec-enhancer.ts — inject root-level x-llm into generated OpenAPI doc
withXLlm(generatedSpec, {
  name: 'TaskTracker',
  description: 'Manage tasks and to-do items',
  defaultApproval: 'per-call',
})
// → { ...spec, 'x-llm': { version: '0.1', name: 'TaskTracker', ... } }
```

```ts
// discovery.ts — create Response for /.well-known/llm.json
createDiscoveryResponse({ openapiPath: '/openapi.json', auth: 'api-key' })
// → Response({ openapi: '/openapi.json', auth: 'api-key' })
```

---

## Package 3: `@opentools/ai-sdk`

Consumer adapter. Replaces the old `packages/opentools-client` concept. Fetches OpenAPI spec from a URL and generates AI SDK tools.

```
packages/ai-sdk/
  package.json         # name: @opentools/ai-sdk, dep: ai@^6, @opentools/spec
  tsconfig.json
  src/
    discovery.ts       # discoverLlm(baseUrl) → LlmDiscovery
    spec-parser.ts     # parseSpec(specUrl) → { root, operations[] }
    tool-generator.ts  # operationsToTools(operations, opts) → { tools, metadata }
    client.ts          # createToolsFromUrl(baseUrl, opts) → { tools, metadata, root }
```

### Public API

```ts
// client.ts — main entry point, URL → AI SDK tools in one call
const { tools, metadata, root } = await createToolsFromUrl('http://localhost:3001', {
  headers: { Authorization: 'Bearer ...' },
  namespace: 'tasks',  // prefix tool names to avoid collisions
})

// tools: Record<string, Tool> — pass directly to streamText({ tools })
// metadata: Record<string, XLlmOperation> — for UI (destructive warnings, approval info)
// root: XLlmRoot — app name/description
```

### Tool Generation Details

- Uses AI SDK v6 `tool()` + `jsonSchema()` — passes raw JSON Schema from OpenAPI, no Zod conversion
- `description` = `summary + '\n' + hint` (if hint exists)
- `needsApproval` = derived from `resolveApproval(operation.xlm, root)` — true when `per-call`
- `execute` = HTTP fetch to endpoint with path param substitution, query params for GET, JSON body for POST/PATCH/DELETE
- Namespace: `{namespace}_{operationId}` to avoid collisions when multiple apps connected

### Internal Pipeline

```
discoverLlm(baseUrl)           → LlmDiscovery (fetches /.well-known/llm.json)
    ↓
parseSpec(discovery.openapi)   → { root: XLlmRoot, operations: ParsedOperation[] }
    ↓
operationsToTools(operations)  → { tools, metadata }
```

---

## Package Config Patterns

All packages follow existing monorepo conventions:

- **package.json** — `type: "module"`, direct path exports (not barrel files), `@workspace/typescript-config` devDep
- **tsconfig.json** — extends `@workspace/typescript-config/base.json`
- **Workspace refs** — `"@opentools/spec": "workspace:*"`

---

## Build Order

```
1. packages/spec        (types — everything depends on this)
2. packages/orpc        (provider adapter)
3. packages/ai-sdk      (consumer adapter)
4. apps/tasks           (demo app using @opentools/orpc)
5. apps/chat            (demo app using @opentools/ai-sdk)
```

Steps 1-3 replace the old "Phase 1: packages/opentools-client" from the implementation plan. The apps phases stay the same but with updated imports.

---

## App Integration

### `apps/tasks` (Provider — uses `@opentools/orpc`)

```ts
// lib/router.ts — xlm() in each route's spec callback
import { xlm } from '@opentools/orpc/metadata'

const deleteTask = os
  .route({
    method: 'DELETE',
    path: '/tasks/{id}',
    spec: s => ({ ...s, ...xlm({ enabled: true, approval: 'per-call', destructive: true }) })
  })
  .input(z.object({ id: z.string() }))
  .handler(async ({ input }) => { /* ... */ })
```

```ts
// app/openapi.json/route.ts — withXLlm() to inject root metadata
import { withXLlm } from '@opentools/orpc/spec-enhancer'

export const GET = async () => {
  const rawSpec = await generator.generate(router)
  const spec = withXLlm(rawSpec, {
    name: 'TaskTracker',
    description: 'Manage tasks and to-do items',
    defaultApproval: 'per-call',
  })
  return Response.json(spec)
}
```

```ts
// app/.well-known/llm.json/route.ts
import { createDiscoveryResponse } from '@opentools/orpc/discovery'

export const GET = () => createDiscoveryResponse({
  openapiPath: '/openapi.json',
  auth: 'api-key',
})
```

### `apps/chat` (Consumer — uses `@opentools/ai-sdk`)

```ts
// lib/tools.ts — load tools from connected apps
import { createToolsFromUrl } from '@opentools/ai-sdk/client'

const { tools, metadata, root } = await createToolsFromUrl('http://localhost:3001', {
  headers: { Authorization: `Bearer ${apiKey}` },
  namespace: 'tasks',
})
```

```ts
// app/api/chat/route.ts — pass tools to LLM
import { streamText } from 'ai'

const result = streamText({
  model: anthropic('claude-sonnet-4-20250514'),
  tools,
  messages,
})
```

```ts
// UI uses metadata for approval/destructive warnings
// metadata[toolName].destructive → show warning
// metadata[toolName].approval → determine if needs confirmation
// root.name → display connected app name
```

---

## AI SDK Version

Target: `ai@^6` (latest stable: 6.0.x)

- `tool()` uses `inputSchema` (not the old `parameters`)
- `jsonSchema()` for passing raw JSON Schema as tool input schema
- `needsApproval` supported as `boolean | ((opts) => boolean | Promise<boolean>)`

---

## Open Questions

1. **oRPC `spec` callback TS typing** — need to verify exact type signature so `xlm()` spread doesn't cause TS errors. May need a cast or broader type.
2. **Namespace separator** — `tasks_listTasks` vs `tasks.listTasks` vs `tasks:listTasks`. AI SDK may have restrictions on tool name characters.
