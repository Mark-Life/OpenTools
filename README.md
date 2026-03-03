# OpenTools

> **Work in progress** — this is an early-stage exploration, not a finished spec or production-ready library.

OpenTools is an idea for letting LLMs auto-discover and interact with web app APIs using OpenAPI extensions. Instead of building custom integrations or MCP servers for every app, a client just needs a URL — the rest is automatic.

## The Idea

Any web app can expose its API to LLMs by adding `x-llm` extensions to its OpenAPI spec and serving a `/.well-known/llm.json` discovery endpoint. Any AI-powered client can then:

1. Fetch the discovery endpoint from a URL
2. Read the OpenAPI spec with `x-llm` metadata (approval policies, destructive flags, hints)
3. Dynamically generate AI SDK tools — no hardcoded integrations

```
User: "Create a task called 'Buy groceries' due tomorrow"

→ Chat app already connected to task tracker via URL
→ LLM sees auto-discovered tools from the app's OpenAPI spec
→ LLM calls createTask tool
→ User approves (per-call policy) → task created
```

## Repo Structure

Turborepo monorepo with three library packages and two demo apps:

```
packages/
  spec/       → @opentools/spec      shared types + constants (zero deps)
  orpc/       → @opentools/orpc      provider adapter for oRPC
  ai-sdk/     → @opentools/ai-sdk    consumer adapter for Vercel AI SDK

apps/
  tasks/      → Task Tracker         demo app exposing an OpenTools-enabled API
  chat/       → Chat App             demo client that connects to any OpenTools app
  web/        → Landing page
```

### Provider side (`@opentools/orpc`)

Helpers for web apps to annotate their oRPC routes with `x-llm` metadata and serve the discovery endpoint.

### Consumer side (`@opentools/ai-sdk`)

`createToolsFromUrl(url, opts)` — takes a URL, fetches the discovery endpoint, parses the OpenAPI spec, and returns AI SDK-compatible tools ready to pass to `streamText()` or `generateText()`.

### Shared spec (`@opentools/spec`)

Types for the `x-llm` extensions: approval levels (`auto` | `per-call`), destructive flags, cost indicators, discovery document shape.

## Demo Apps

**Task Tracker** (`apps/tasks`) — simple CRUD app built with oRPC + Next.js. Exposes `/.well-known/llm.json` and an OpenAPI spec with `x-llm` annotations on each operation.

**Chat App** (`apps/chat`) — AI chat interface using Vercel AI SDK. Connect any OpenTools-compatible app by URL, and the LLM can interact with it through auto-discovered tools with per-action approval.

## Status

This is an early exploration of the concept. The core packages (`spec`, `orpc`, `ai-sdk`) have initial implementations. The demo apps are partially built. Auth is API-key only for now (OAuth2 + CIMD planned for later).

Not yet: npm published, production-tested, or spec-finalized.

## Tech Stack

- **Runtime**: Bun
- **Build**: Turborepo
- **Framework**: Next.js
- **API**: oRPC + OpenAPI
- **AI**: Vercel AI SDK v6
- **UI**: shadcn/ui + Tailwind CSS
- **Code quality**: Ultracite (Biome)

## Development

```bash
bun install
bun dev        # starts all apps (web :3000, tasks :3001, chat :3002)
```

## Docs

See `docs/` for more detail:

- [`demo-goal.md`](docs/demo-goal.md) — full demo vision and auth strategy
- [`package-architecture.md`](docs/package-architecture.md) — package design and API surface
- [`implementation-plan.md`](docs/implementation-plan.md) — build phases and verification steps
