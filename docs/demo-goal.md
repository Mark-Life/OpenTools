# OpenTools Demo Goal

## Overview

Working demo of the OpenTools spec: two apps demonstrating LLM auto-discovery and interaction with web apps via OpenAPI `x-llm` extensions.

## App 1: Task Tracker (OpenTools-enabled app)

The "server" side — a web app that exposes its functionality via oRPC with OpenAPI + `x-llm` extensions.

### Features

- Simple task CRUD
- Task model:
  - name (required)
  - description (optional)
  - due date (optional)
  - status: `todo` | `in-progress` | `done`
- Web UI for managing tasks (standard Next.js app)
- oRPC procedures for all CRUD operations
- OpenAPI spec generated from oRPC with `x-llm` extensions on each operation
- `/.well-known/llm.json` discovery endpoint pointing to the OpenAPI spec
- Auth: OAuth2 so external apps can act on behalf of users

### oRPC Procedures (expected)

| Procedure | Method | Approval | Destructive |
|-----------|--------|----------|-------------|
| listTasks | GET | auto | no |
| getTask | GET | auto | no |
| createTask | POST | per-call | no |
| updateTask | PATCH | per-call | no |
| deleteTask | DELETE | per-call | yes |

## App 2: Chat App (LLM client)

The "client" side — a chat interface that can connect to any OpenTools-compatible app and interact with it on behalf of the user.

### Features

- Chat UI with AI SDK (streaming)
- Settings page for connecting external apps
- Core `opentools-client` logic:
  1. User provides a URL
  2. Client fetches `/.well-known/llm.json`
  3. Reads OpenAPI spec
  4. Dynamically generates AI SDK tools from `x-llm`-enabled operations
- Server-side fetch: model can call external APIs through the server
- Approval UI: per-call confirmation for write/delete operations
- Auth: OAuth2 flow to authenticate with connected apps on behalf of the user

### Core Flow

```
User: "Create a task called 'Buy groceries' with due date tomorrow"

1. Chat app already connected to task tracker (user authorized via OAuth2)
2. LLM sees dynamically generated tools from task tracker's OpenAPI spec
3. LLM calls createTask tool with { name: "Buy groceries", dueDate: "2026-02-19" }
4. Chat app checks approval policy → per-call → shows confirmation to user
5. User approves → chat app server calls task tracker API with OAuth2 token
6. Task created → result shown in chat
```

## Auth Strategy

### Phase 1: API Key (prototype)
- User generates API key in task tracker
- Pastes into chat app settings
- Chat app sends as `Authorization: Bearer <key>`
- Goal: get the oRPC → OpenAPI → AI SDK tools pipeline working first

### Phase 2: OAuth2 + CIMD (demo-ready)

Use [CIMD (Client ID Metadata Documents)](https://www.ietf.org/archive/id/draft-ietf-oauth-client-id-metadata-document-01.html) for zero-registration OAuth2. Instead of pre-registering the chat app with every task tracker, the chat app hosts a static metadata document and uses its URL as the `client_id`.

**Why CIMD over traditional OAuth2 registration:**
- No pre-registration step — aligns with OpenTools' zero-config philosophy
- URLs as identity — symmetric with `/.well-known/llm.json` discovery
- Stateless for the server — no client registration database needed
- Same `client_id` works across all connected apps
- [Adopted by MCP spec (Nov 2025)](https://auth0.com/blog/mcp-november-2025-specification-update/) as the preferred client registration method

**Chat app hosts a CIMD document** (e.g. `https://chat.example.com/.well-known/oauth-client.json`):

```json
{
  "client_id": "https://chat.example.com/.well-known/oauth-client.json",
  "client_name": "OpenTools Chat",
  "redirect_uris": ["https://chat.example.com/api/auth/callback"],
  "grant_types": ["authorization_code"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
```

**Flow:**
1. User clicks "Connect to tasks.app" in chat app
2. Chat app sends OAuth2 authorize request with `client_id=https://chat.example.com/.well-known/oauth-client.json`
3. Task tracker fetches the CIMD document, validates `redirect_uri` match
4. User logs in, approves scoped permissions
5. Standard OAuth2 + PKCE completes — chat app receives token
6. No API key copy-pasting, no pre-registration, user controls permissions, revocable

**Task tracker requirements:**
- OAuth2 authorization server must support CIMD (fetch + validate client metadata from URL)
- SSRF protections when fetching CIMD documents (block private IPs, enforce HTTPS, timeouts)
- Options: implement with [Better Auth](https://www.better-auth.com/), or use a provider that supports CIMD ([WorkOS](https://workos.com/blog/mcp-client-registration-cimd-vs-dcr), [Stytch](https://stytch.com/blog/stytch-supports-cimd/), [Auth0](https://auth0.com/blog/cimd-vs-dcr-mcp-registration/), [Authlete](https://www.authlete.com/developers/cimd/))

**Demo narrative upgrade:**
> "No registration. No API keys. Just paste a URL, authorize, and your AI interacts with the app."

## The `opentools-client` SDK

Core deliverable — the library that makes "paste a URL, get tools" work.

### Responsibilities

1. Fetch `/.well-known/llm.json` from a given URL
2. Fetch the referenced OpenAPI spec
3. Parse operations with `x-llm.enabled: true`
4. Generate AI SDK `tool()` definitions dynamically
5. Handle approval policies (surface to the UI layer)
6. Attach auth credentials to outgoing calls

### Input/Output

```typescript
// Input: a URL + auth tokens
const tools = await createToolsFromUrl("https://tasks.example.com", { token })

// Output: AI SDK compatible tools
const result = await generateText({
  model: anthropic("claude-sonnet-4-20250514"),
  tools,
  prompt: userMessage,
})
```

## Notifications

Not needed for the core demo. The flow is synchronous HTTP request → response:
- Chat app calls task tracker API → gets response → shows in chat
- Task tracker processes the request normally
- If user opens task tracker UI, they see the changes

Notifications (SSE/WebSocket for "a task was created on your behalf") are a nice-to-have for later, not part of the MVP demo.

## Open Questions

### Repo Structure
- Should both apps live in this monorepo (`apps/tasks`, `apps/chat`) or separate repos?
- Monorepo: simpler dev, shared packages
- Separate repos: more realistic cross-origin demo narrative

### SDK Packaging
- Should `opentools-client` be a separate package (`packages/opentools-client`) publishable to npm?
- Or build inline in the chat app first, extract later?

### Auth Details
- CIMD-aware OAuth2 server: build with Better Auth, or use a hosted provider (WorkOS, Stytch, Auth0)?
- If self-hosted: SSRF protection strategy for CIMD document fetching
- OAuth2 scope definitions for the task tracker
- Token storage strategy in the chat app
- CIMD document hosting: `/.well-known/oauth-client.json` or custom path?

### AI Provider
- Which LLM provider/model for the chat app backend? (Likely Anthropic Claude via AI SDK)

### Current `apps/web`
- Keep as landing/docs page for OpenTools, or repurpose as one of the demo apps?

### Extension Naming
- `x-llm` vs `x-opentools` vs `x-agent` for the OpenAPI extension prefix

### Discovery Mechanism
- `/.well-known/llm.json` pointing to OpenAPI spec?
- Or convention that `/.well-known/openapi.json` with `x-llm` root field is sufficient?

### Security
- How to prevent malicious manifests from social-engineering the LLM?
- Sandboxing / validation of discovered specs

## Demo Narrative

The pitch when showing this:

> "I have a task tracker app. I paste its URL into my chat app. The chat app auto-discovers what actions are available, asks me to authorize, and now my AI assistant can create tasks, mark them done, and manage my to-do list — all through natural conversation, with my approval for every action. No MCP server setup. No plugins. Just a URL."
