# OpenTools Demo — Implementation Plan

## Context

Build a working demo of the OpenTools spec: LLM auto-discovery of web app APIs via OpenAPI `x-llm` extensions. Two apps + one SDK, all in this monorepo.

## Decisions

- `apps/web` = landing/docs (untouched)
- `apps/tasks` = Task Tracker (oRPC API + web UI)
- `apps/chat` = Chat App (AI SDK streaming + tool approval)
- `packages/opentools-client` = core SDK (URL → AI SDK tools)
- In-memory storage, API key auth (Phase 1), `x-llm` prefix, `/.well-known/llm.json` discovery
- Ports: web=3000, tasks=3001, chat=3002

## Build Order

```
packages/opentools-client → apps/tasks → apps/chat
```

---

## Phase 1: `packages/opentools-client`

Zero app dependencies. Both apps consume it.

```
packages/opentools-client/
  package.json        # @workspace/opentools-client, deps: ai, zod
  tsconfig.json       # extends typescript-config/base
  src/
    index.ts          # barrel
    types.ts          # XLlmRoot, XLlmOperation, LlmDiscovery, ParsedOperation
    discovery.ts      # discoverLlm(baseUrl) → fetch /.well-known/llm.json
    spec-parser.ts    # parseSpec(specUrl) → { root, operations[] }
    tool-generator.ts # createToolsFromUrl(baseUrl, opts) → { tools, metadata }
```

Key: use AI SDK `jsonSchema()` to pass JSON Schema directly — no Zod conversion at runtime.

`createToolsFromUrl` returns `{ tools, metadata }` where metadata is `Record<string, XLlmOperation>` for UI to show destructive warnings, approval info, etc.

---

## Phase 2: `apps/tasks` (Task Tracker)

### Structure
```
apps/tasks/
  package.json          # deps: @orpc/server, @orpc/openapi, @orpc/zod, zod, @workspace/ui
  next.config.ts        # copy pattern from apps/web
  tsconfig.json
  app/
    layout.tsx
    page.tsx             # task list UI
    api/[...rest]/route.ts    # oRPC OpenAPI handler
    openapi.json/route.ts     # serve generated spec with x-llm root
    .well-known/llm.json/route.ts  # discovery endpoint
  lib/
    schemas.ts           # Task, CreateTaskInput, UpdateTaskInput (Zod)
    store.ts             # in-memory Map<id, Task>, pre-seeded
    router.ts            # 5 oRPC procedures with x-llm via route.spec callback
  components/
    providers.tsx
    task-list.tsx
    task-form.tsx
    task-card.tsx
```

### Task Model
```
id, name (required), description?, dueDate?, status (todo|in-progress|done), createdAt
```

### Procedures
| Procedure | Method | Path | Approval | Destructive |
|-----------|--------|------|----------|-------------|
| listTasks | GET | /tasks | auto | no |
| getTask | GET | /tasks/{id} | auto | no |
| createTask | POST | /tasks | per-call | no |
| updateTask | PATCH | /tasks/{id} | per-call | no |
| deleteTask | DELETE | /tasks/{id} | per-call | yes |

### OpenAPI + x-llm
- oRPC `OpenAPIGenerator` generates spec; inject root `x-llm` manually onto output
- Each procedure uses `.route({ spec: s => ({ ...s, "x-llm": { ... } }) })`
- `/.well-known/llm.json` returns `{ openapi: "/openapi.json", auth: "api-key" }`

### Web UI
Client-side fetch to `/api/tasks`. shadcn Card, Badge (status), Button, Dialog (create/edit). Minimal but functional.

---

## Phase 3: `apps/chat` (Chat App)

### Structure
```
apps/chat/
  package.json          # deps: ai, @ai-sdk/anthropic, @ai-sdk/react, @workspace/opentools-client, @workspace/ui
  next.config.ts
  .env.local            # ANTHROPIC_API_KEY
  app/
    layout.tsx
    page.tsx             # chat interface
    settings/page.tsx    # connect apps
    api/
      chat/route.ts      # streamText with dynamic tools
      connections/route.ts  # CRUD connected apps
  lib/
    connections.ts       # in-memory Map<id, Connection> (baseUrl + token)
    tools.ts             # loadAllTools(connections) via opentools-client
  components/
    providers.tsx
    chat-interface.tsx   # useChat + message rendering
    tool-approval.tsx    # approve/deny for per-call tools
    connection-form.tsx  # add URL + API key
    connection-list.tsx  # show/remove connected apps
```

### Chat API Route
- `streamText` with `anthropic("claude-sonnet-4-20250514")`
- Tools loaded dynamically from all connections via `createToolsFromUrl`
- Tool names namespaced by app name (from x-llm.name) to avoid collisions

### Approval Flow
- AI SDK `needsApproval` set per tool from x-llm.approval
- `useChat` with `addToolApprovalResponse` for approve/deny
- Tool approval component shows: tool name, params, destructive warning if flagged

### Settings Page
- Form: base URL + API key → validates by fetching `/.well-known/llm.json` → stores connection
- List of connected apps with disconnect

---

## Phase 4: Polish

- API key auth middleware on tasks app (accept Bearer token)
- CORS via oRPC CORSPlugin (allow all origins for demo)
- Error handling in opentools-client (network, invalid spec)
- Loading states, toasts, dark mode toggle in both UIs

---

## Dependencies to Install

| Package | Where |
|---------|-------|
| `@orpc/server` `@orpc/openapi` `@orpc/zod` `zod` | apps/tasks |
| `ai` `zod` | packages/opentools-client |
| `ai` `@ai-sdk/anthropic` `@ai-sdk/react` | apps/chat |
| `@workspace/ui` | apps/tasks, apps/chat |
| `@workspace/opentools-client` | apps/chat |

---

## Verification

```bash
bun dev  # starts all 3 apps

# Test tasks API
curl localhost:3001/.well-known/llm.json
curl localhost:3001/openapi.json | jq '.["x-llm"]'
curl localhost:3001/api/tasks

# Test chat flow
# 1. Settings: connect http://localhost:3001 with API key
# 2. Chat: "List all tasks" → auto-approved, shows results
# 3. Chat: "Create task 'Buy groceries' due tomorrow" → approval prompt → approve → created
# 4. Verify task appears in tasks app UI at localhost:3001
```

---

## Open Questions

1. **oRPC `route.spec` callback** — need to verify exact API for injecting x-llm alongside operationId/tags/summary in same `.route()` call
2. **AI SDK version** — v5 vs v6 changes useChat API significantly (sendMessage vs handleSubmit). Need to check current stable.
3. **Zod version** — workspace has zod 3.25+ which straddles v3/v4. Need to verify @orpc/zod compatibility.
