# CIMD Auth & Discovery — Implementation Plan

## Current State

- Auth: API key only (user pastes key into chat app settings)
- Discovery: `/.well-known/llm.json` returns `{ openapi, auth: "api-key" }`
- No OAuth, no session management, no token storage
- Connection stored in-memory: `{ id, name, baseUrl, apiKey }`

## Target State

Zero-registration OAuth2: user pastes a URL, chat app discovers auth requirements, performs CIMD-based OAuth2 + PKCE, gets token, executes tools on behalf of user. No API keys, no pre-registration.

---

## CIMD Overview

**Client ID Metadata Document** ([IETF draft](https://www.ietf.org/archive/id/draft-ietf-oauth-client-id-metadata-document-01.html)) — replaces server-issued `client_id` with a **client-hosted HTTPS URL**. The URL IS the client_id. Authorization server fetches the JSON document at that URL to learn about the client on-demand.

Adopted by MCP spec (Nov 2025) as the recommended client registration method, replacing DCR.

### CIMD Document Format

Chat app hosts this at e.g. `https://chat.opentools.dev/.well-known/oauth-client.json`:

```json
{
  "client_id": "https://chat.opentools.dev/.well-known/oauth-client.json",
  "client_name": "OpenTools Chat",
  "client_uri": "https://chat.opentools.dev",
  "redirect_uris": ["https://chat.opentools.dev/api/auth/callback"],
  "grant_types": ["authorization_code"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
```

Rules:
- `client_id` MUST match the hosting URL exactly (string comparison, not URL normalization)
- No `client_secret` allowed — public client only (or `private_key_jwt` for confidential)
- Max 5 KB document size
- HTTPS required

### OAuth2 + CIMD Flow

```
1. User clicks "Connect" and provides app URL (e.g. tasks.opentools.dev)
2. Chat app fetches /.well-known/llm.json → gets { openapi, auth: "oauth2", authorizationServer }
3. Chat app fetches AS metadata from /.well-known/oauth-authorization-server
   → gets { authorization_endpoint, token_endpoint, client_id_metadata_document_supported, ... }
4. Chat app confirms AS supports CIMD (client_id_metadata_document_supported: true)
5. Chat app generates PKCE pair (code_verifier + code_challenge with S256)
6. Chat app redirects user to AS authorize endpoint:
   - client_id=https://chat.opentools.dev/.well-known/oauth-client.json
   - redirect_uri=https://chat.opentools.dev/api/auth/callback
   - code_challenge=<S256 hash>
   - code_challenge_method=S256
   - response_type=code
   - scope=tasks:read tasks:write
   - state=<random>
7. AS detects URL-format client_id → fetches CIMD document from that URL
8. AS validates: client_id field matches URL, redirect_uri in allowlist
9. AS shows consent screen with client_name, logo from CIMD
10. User approves
11. AS redirects to callback with authorization code
12. Chat app exchanges code for tokens at token endpoint (with code_verifier)
13. Chat app stores access_token + refresh_token for this connection
14. All subsequent tool calls use Bearer token
```

---

## What Needs to Change

### 1. Discovery Protocol Enhancement

Current `/.well-known/llm.json`:
```json
{ "openapi": "/openapi.json", "auth": "api-key" }
```

New format:
```json
{
  "openapi": "/openapi.json",
  "auth": {
    "type": "oauth2",
    "authorization_server": "/.well-known/oauth-authorization-server"
  }
}
```

Or follow MCP's approach with **Protected Resource Metadata (RFC 9728)**:
```json
{
  "openapi": "/openapi.json",
  "auth": {
    "type": "oauth2",
    "resource_metadata": "/.well-known/oauth-protected-resource"
  }
}
```

The resource metadata endpoint returns:
```json
{
  "resource": "https://tasks.opentools.dev",
  "authorization_servers": ["https://tasks.opentools.dev"],
  "scopes_supported": ["tasks:read", "tasks:write", "tasks:delete"]
}
```

**Decision needed**: use simplified discovery (direct AS URL) or full RFC 9728 compliance.

### 2. Tasks App — OAuth2 Authorization Server

The tasks app needs to become an OAuth2 AS that supports CIMD. Options:

#### Option A: Better Auth (self-hosted)
- Already a popular TS auth library, fits our stack
- Has MCP plugin with OAuth provider capabilities
- **Does NOT support CIMD yet** (GitHub issue #7184 open since Jan 2026)
- Would need to implement CIMD validation ourselves on top of Better Auth's OAuth provider

#### Option B: WorkOS / Stytch / Auth0 (hosted provider)
- WorkOS and Stytch confirmed CIMD support
- Auth0 has analysis but unclear if shipped
- Adds external dependency, but production-ready
- More realistic for "real" apps

#### Option C: Minimal custom OAuth2 AS
- Build a minimal OAuth2 authorization server with CIMD support directly
- Only need: authorize endpoint, token endpoint, CIMD fetch+validate
- Simpler for demo, full control
- Not production-grade but demonstrates the flow

**Recommendation**: Option C for demo (minimal custom), with notes on Option B for production.

### 3. Tasks App — AS Implementation Requirements

```
Endpoints:
  GET  /.well-known/oauth-authorization-server  → AS metadata
  GET  /.well-known/oauth-protected-resource     → resource metadata (optional)
  GET  /oauth/authorize                          → authorization page
  POST /oauth/token                              → token exchange
  POST /oauth/revoke                             → token revocation (optional)
```

AS metadata response:
```json
{
  "issuer": "https://tasks.opentools.dev",
  "authorization_endpoint": "https://tasks.opentools.dev/oauth/authorize",
  "token_endpoint": "https://tasks.opentools.dev/oauth/token",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "client_id_metadata_document_supported": true,
  "scopes_supported": ["tasks:read", "tasks:write", "tasks:delete"]
}
```

CIMD validation logic (on authorize request):
1. Check if `client_id` is a URL (starts with `https://`)
2. Fetch the URL — **no redirects**, HTTPS only, timeout 5s, max 5KB
3. Parse JSON, validate `client_id` field matches URL exactly
4. Validate `redirect_uri` is in `redirect_uris` array (exact match)
5. Block private/reserved IPs (SSRF protection)
6. Cache per HTTP cache headers

PKCE validation:
1. Store `code_challenge` + `code_challenge_method` with authorization code
2. On token exchange, verify `code_verifier` produces matching challenge

Token storage (in-memory for demo):
```ts
type AuthCode = {
  code: string
  clientId: string
  redirectUri: string
  codeChallenge: string
  userId: string
  scopes: string[]
  expiresAt: number
}

type AccessToken = {
  token: string
  clientId: string
  userId: string
  scopes: string[]
  expiresAt: number
}
```

### 4. Chat App — OAuth2 Client with CIMD

#### New: CIMD document endpoint
```
GET /.well-known/oauth-client.json → static JSON (the CIMD document)
```

#### Updated connection flow

Replace "paste API key" with:

```
1. User enters app URL
2. Chat app discovers /.well-known/llm.json
3. If auth.type === "oauth2":
   a. Fetch AS metadata
   b. Check CIMD support
   c. Generate PKCE pair, store in session/cookie
   d. Redirect user to authorize endpoint
4. User approves on tasks app
5. Callback receives code
6. Exchange code for tokens
7. Store tokens with connection
8. Connection ready — tools loaded with Bearer token
```

#### Token management
- Store access_token + refresh_token per connection
- Auto-refresh when access_token expires (use refresh_token)
- Handle token revocation on disconnect

#### Updated Connection type
```ts
type Connection = {
  id: string
  name: string
  baseUrl: string
  // Phase 1 (current)
  apiKey?: string
  // Phase 2 (CIMD OAuth2)
  auth?: {
    type: 'oauth2'
    accessToken: string
    refreshToken?: string
    expiresAt?: number
    scopes: string[]
  }
}
```

### 5. Package Changes

#### `@opentools/spec` — types.ts
Add auth-related types:
```ts
type LlmDiscoveryAuth =
  | { type: 'api-key' }
  | { type: 'oauth2'; authorization_server?: string }
  | { type: 'none' }

// Update LlmDiscovery
type LlmDiscovery = {
  openapi: string
  auth: string | LlmDiscoveryAuth  // backward compat with string
}
```

#### `@opentools/ai-sdk` — client.ts
- After discovery, if auth is oauth2, don't proceed to tool loading without a valid token
- Return auth requirements so UI can initiate OAuth flow
- Accept token in options (same as current headers approach)

---

## Security Considerations

### SSRF Protection (Tasks App AS)
When fetching CIMD documents:
- Block private IPs: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`, `fc00::/7`
- HTTPS only
- No redirect following
- 5-second timeout
- 5KB max response size
- DNS rebinding protection (resolve DNS first, check IP, then fetch)

### Token Security
- Short-lived access tokens (15 min)
- Refresh token rotation
- Scope enforcement on every API call
- Tokens bound to specific client_id

### Consent Screen
- Display client_name and hostname from CIMD
- Show requested scopes in human-readable form
- Warn on localhost redirect URIs

---

## Implementation Order

```
1. @opentools/spec        — add auth types to LlmDiscovery
2. apps/tasks/oauth       — minimal OAuth2 AS with CIMD support
   - AS metadata endpoint
   - Authorize endpoint + consent page
   - Token endpoint with PKCE
   - CIMD fetch + validate
   - SSRF protection
   - In-memory code/token storage
3. apps/tasks/.well-known — update llm.json to declare oauth2
4. apps/tasks/middleware   — token validation on API routes
5. apps/chat/cimd         — host CIMD document
6. apps/chat/oauth        — OAuth2 client flow
   - Discover AS from llm.json
   - Initiate authorize redirect
   - Handle callback
   - Token exchange + storage
7. apps/chat/settings     — update UI for OAuth connect flow
8. apps/chat/tools        — pass OAuth token to tool execution
9. @opentools/ai-sdk      — return auth requirements from discovery
```

---

## Open Questions

1. **Discovery auth format** — keep `auth: "api-key"` string format for simplicity, or switch to object `{ type: "oauth2", ... }`? Object is more extensible.

2. **User identity on tasks app** — for demo, do we need real user accounts? Or is "any valid OAuth token = authorized"? Minimal: single demo user, consent is just "approve this app".

3. **Token persistence** — in-memory is fine for demo but tokens lost on restart. Use cookies/localStorage on chat side? Or add a simple DB (SQLite/Turso)?

4. **Scope granularity** — `tasks:read`, `tasks:write`, `tasks:delete`? Or simpler `read`, `write`? Map to x-llm approval levels?

5. **Backward compatibility** — keep API key auth working alongside OAuth2? Useful for development/testing.

6. **HTTPS requirement** — CIMD requires HTTPS. For local dev, do we relax this (allow http://localhost) or use self-signed certs / tunnels (ngrok, Cloudflare Tunnel)?

7. **Custom AS vs library** — Build minimal OAuth AS from scratch (simpler, educational) or wait for Better Auth CIMD support?

---

## References

- [IETF CIMD Draft](https://www.ietf.org/archive/id/draft-ietf-oauth-client-id-metadata-document-01.html)
- [MCP Auth Spec (Nov 2025 draft)](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [Aaron Parecki: MCP Auth Update Analysis](https://aaronparecki.com/2025/11/25/1/mcp-authorization-spec-update)
- [WorkOS: CIMD vs DCR](https://workos.com/blog/mcp-client-registration-cimd-vs-dcr)
- [Better Auth MCP Plugin](https://better-auth.com/docs/plugins/mcp)
- [Better Auth CIMD Issue #7184](https://github.com/better-auth/better-auth/issues/7184)
- [RFC 7636: PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 9728: Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)
