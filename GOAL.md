# OpenTools

## Vision

A web standard for LLMs to discover and interact with web applications programmatically — without scraping UIs or pre-configuring MCP servers. A machine-readable API layer that any LLM client can auto-discover and use, with built-in user consent.

**Core idea**: User gives a URL to their LLM client → client discovers available actions → LLM can interact with the app on behalf of the user.

## Problem

- MCPs require manual setup — can't auto-discover
- ChatGPT plugins were platform-locked (and killed)
- Plain REST APIs have no LLM-specific semantics (approval, hints, rate limits)
- Screen scraping / browser automation is fragile and slow

## Approach: OpenAPI Extensions

Build on top of OpenAPI rather than creating a separate spec. This enables broader adoption since many frameworks already generate OpenAPI (oRPC, Hono, FastAPI, NestJS, etc.).

### Why OpenAPI Extensions > Separate Spec

1. oRPC, Hono, FastAPI, NestJS — all already generate OpenAPI. Adding `x-llm` metadata is minimal effort
2. Zod `.describe()` already flows into both AI SDK tool descriptions AND OpenAPI descriptions — single source of truth
3. Auth is already defined in OpenAPI's `securitySchemes` — no duplication
4. Existing tooling (Swagger UI, Redocly) just ignores unknown `x-` fields — nothing breaks
5. Incremental adoption — add `x-llm` to one endpoint, not rewrite your whole API

### The `x-llm` Extension

**Document root** (global config):

```yaml
x-llm:
  version: "0.1"
  name: "RecipeApp"
  description: "Save, organize, and discover recipes"
  defaultApproval: "per-call"
```

**Operation level** (per endpoint):

```yaml
x-llm:
  enabled: true                    # expose this to LLMs
  approval: "auto" | "per-call"   # minimum approval level
  blanketApprovalAllowed: boolean  # can user opt into "always allow"
  destructive: boolean             # UI hint: show warning
  rateLimit: { max, window }      # per-user throttle for LLM calls
  hint: string                     # when to use this (richer than summary)
  costIndicator: "free" | "credits" | "paid"
```

### What OpenAPI Doesn't Cover (extensions needed)

- **Semantic descriptions** — not just "POST /favorites" but natural language explaining when/why to use it (`hint` field)
- **Approval policies** — the consent model
- **Rate limits per action** — so the LLM can self-throttle
- **Result rendering hints** — "show this as a card" vs "read back as text"
- **Action chaining hints** — "after searching, user typically wants to save"
- **Cost indicators** — "this action costs the user credits"
- **Destructive flags** — UI warnings for dangerous operations

## Discovery

Minimal well-known entry point:

```
GET /.well-known/llm.json
```

```json
{
  "openapi": "/openapi.json",
  "auth": "oauth2"
}
```

Or even simpler convention: if your OpenAPI doc has `x-llm` at the root, you support this. Clients just check `/.well-known/openapi.json` and look for the extension.

## Approval Model

Three layers of consent:

| Level | Who decides | Example |
|-------|------------|---------|
| **Site policy** | App developer sets `approval` + `blanketApprovalAllowed` | "Delete always requires confirmation" |
| **User preference** | User can escalate (never downgrade) | "I want to approve all writes" |
| **LLM client** | ChatGPT/your app enforces both | Shows confirmation UI before calling |

By default all interactions are user-approved. The app developer sets the *minimum* required approval level. The user can only make it stricter, never looser.

## Auth

OAuth2 is the natural fit. When a user says "connect to recipes.app":

1. LLM client reads `/.well-known/llm.json`
2. Initiates OAuth2 flow — user logs in, grants scoped permissions
3. Client stores tokens, uses them for subsequent API calls
4. Each call respects the approval policy from the manifest

Auth is defined via standard OpenAPI `securitySchemes` — no new spec needed.

## Pipeline: Zod → OpenAPI → LLM Tools

```
Zod schema + .describe()
        │
        ▼
   oRPC / Hono / tRPC-openapi
        │
        ▼
   OpenAPI spec (with x-llm extensions)
        │
        ▼
   /.well-known/openapi.json
        │
        ▼
   LLM client reads spec
        │
        ▼
   Dynamically generates AI SDK tools
```

## Example: oRPC Route Definition

```typescript
const searchRecipes = router.get('/recipes/search', {
  input: z.object({
    query: z.string().describe("Search term for recipes"),
    cuisine: z.enum(["italian", "japanese", "mexican"]).describe("Filter by cuisine type"),
    maxTime: z.number().optional().describe("Max prep time in minutes"),
  }),
  meta: {
    operationId: 'searchRecipes',
    summary: 'Search recipes by ingredients or cuisine',
    tags: ['recipes'],
    'x-llm': {
      enabled: true,
      approval: 'auto',
      rateLimit: { max: 30, window: '1m' },
      hint: 'Use when user asks to find or discover recipes',
    }
  },
  handler: async ({ input }) => { /* ... */ }
})

const addFavorite = router.post('/favorites', {
  input: z.object({
    recipeId: z.string().describe("ID of recipe to save"),
  }),
  meta: {
    operationId: 'addFavorite',
    summary: 'Save recipe to favorites',
    'x-llm': {
      enabled: true,
      approval: 'per-call',
      blanketApprovalAllowed: true,
      hint: 'Use when user wants to save/bookmark a recipe',
    }
  },
  handler: async ({ input }) => { /* ... */ }
})

const deleteRecipe = router.delete('/recipes/:id', {
  meta: {
    operationId: 'deleteRecipe',
    'x-llm': {
      enabled: true,
      approval: 'per-call',
      blanketApprovalAllowed: false,
      destructive: true,
    }
  },
  handler: async ({ input }) => { /* ... */ }
})
```

## Example: Client-Side Tool Generation

```typescript
/** Converts OpenAPI operations with x-llm into AI SDK tools */
const toolsFromOpenAPI = (spec: OpenAPIDocument, tokens: AuthTokens) => {
  const ops = getOperationsWithXLlm(spec)

  return Object.fromEntries(ops.map(op => [
    op.operationId,
    tool({
      description: op.summary + (op['x-llm']?.hint ? `\n${op['x-llm'].hint}` : ''),
      parameters: jsonSchemaToZod(op.parameters),
      execute: async (params) => {
        const llmMeta = op['x-llm']
        if (llmMeta.approval === 'per-call') {
          const approved = await requestApproval(op, params)
          if (!approved) return { denied: true }
        }
        return fetchEndpoint(op, params, tokens)
      }
    })
  ]))
}
```

## Example: User Flow

```
User: "Find me a good pasta recipe and save it"

LLM thinks:
1. I see recipes.app is connected
2. Read manifest → search_recipes (auto-approve) + save_favorite (per-call)
3. Call search_recipes → get results
4. Present results to user
5. User picks one → LLM requests save_favorite
6. Client shows: "RecipeApp wants to save 'Cacio e Pepe' to favorites. Allow? [Yes] [Always allow]"
7. User approves → call executes
```

## Comparison to Existing Approaches

| Approach | Discovery | Auth | Approval | LLM-native | Open |
|----------|-----------|------|----------|------------|------|
| **MCP** | Manual setup | Varies | Client-side | Yes | Yes |
| **OpenAPI + plugins (ChatGPT)** | Manual registration | OAuth | Basic | Partially | No |
| **Plain REST APIs** | Documentation | API keys | None | No | Yes |
| **OpenTools** | Auto-discovery | OAuth2 | Spec-defined | Yes | Yes |

## Demo Plan

Three deliverables:

1. **The spec** — JSON Schema for the `x-llm` OpenAPI extension
2. **A sample web app** — recipe app or similar, serving OpenAPI with `x-llm` + OAuth (oRPC or Hono)
3. **A client library** (`opentools-client` or similar) — reads OpenAPI spec, outputs AI SDK tools dynamically. This is the core deliverable — makes "paste a URL, get tools" work.

## Open Questions

- Should discovery be `/.well-known/llm.json` pointing to OpenAPI, or just convention that `/.well-known/openapi.json` with `x-llm` root field is enough?
- How to handle stateful flows? (multi-step wizards, transactions)
- Versioning — how does the client handle spec version changes?
- Security — how to prevent a malicious manifest from social-engineering the LLM into harmful actions? (e.g., misleading descriptions)
- Offline/cached discovery — should clients cache specs? For how long?
- Naming: `x-llm` vs `x-opentools` vs `x-agent` for the extension prefix?
- How to handle streaming responses from endpoints?
- Should there be a registry of OpenTools-compatible apps? Or is discovery enough?

## Alternative Names Considered

- **LLM Actions** — direct, describes what it is
- **WebActions** — "web standard" energy, vendor neutral
- **OpenTools** — riffs on OpenAPI, implies open standard for tool use (chosen)
- **AgentAPI** — API layer for agents
