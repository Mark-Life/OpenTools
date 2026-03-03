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
