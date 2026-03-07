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

**Decision: Option B — WorkOS AuthKit**

Since OpenTools apps will be deployed publicly, a real auth provider is the right choice. A custom minimal AS would simulate the protocol but not demonstrate real-world usage. Developers building on the OpenTools standard need to see how to integrate with a production auth provider.

### 3. Tasks App — WorkOS AuthKit Integration

With WorkOS as the Authorization Server, the tasks app is a **resource server only**. WorkOS handles all OAuth2/CIMD complexity (authorization, consent, token issuance, CIMD validation, PKCE).

#### What WorkOS handles (we don't build):
- OAuth2 authorization endpoint (`/oauth2/authorize`)
- Token endpoint (`/oauth2/token`)
- User login & consent screens
- CIMD document fetching & validation
- PKCE support
- JWT issuance (access + refresh tokens)
- JWKS endpoint for token verification

#### What the tasks app implements:

**Endpoints:**
```
GET  /.well-known/oauth-protected-resource      → resource metadata (points to WorkOS)
GET  /.well-known/oauth-authorization-server     → proxy WorkOS AS metadata
```

**Protected Resource Metadata:**
```json
{
  "resource": "https://tasks.opentools.dev",
  "authorization_servers": ["https://<authkit_domain>"],
  "bearer_methods_supported": ["header"]
}
```

**AS Metadata Proxy** — fetches and forwards WorkOS's own metadata:
```ts
// GET /.well-known/oauth-authorization-server
const response = await fetch('https://<authkit_domain>/.well-known/oauth-authorization-server')
const metadata = await response.json()
return Response.json(metadata)
```

**Bearer Token Middleware** — verify JWTs issued by WorkOS using `jose`:
```ts
import { jwtVerify, createRemoteJWKSet } from 'jose'

const JWKS = createRemoteJWKSet(
  new URL('https://<authkit_domain>/oauth2/jwks')
)

const WWW_AUTHENTICATE_HEADER = [
  'Bearer error="unauthorized"',
  'error_description="Authorization needed"',
  'resource_metadata="https://tasks.opentools.dev/.well-known/oauth-protected-resource"',
].join(', ')

// On 401: return WWW-Authenticate header with resource_metadata URL
// This enables clients to auto-discover the authorization server

// On valid token:
const { payload } = await jwtVerify(token, JWKS, {
  issuer: 'https://<authkit_domain>',
})
// payload.sub = user ID, use for authorization
```

#### WorkOS Dashboard Setup:
1. Create AuthKit project
2. Navigate to Connect → Configuration
3. Enable Client ID Metadata Document (CIMD)
4. Optionally enable Dynamic Client Registration (DCR) for backward compat
5. Configure allowed redirect URIs, scopes

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

### CIMD Validation (handled by WorkOS)
WorkOS handles CIMD document fetching and validation, including:
- SSRF protection
- HTTPS enforcement
- Document size limits
- `client_id` ↔ URL matching
- `redirect_uri` allowlist validation

### Token Security (handled by WorkOS)
- JWT access tokens verified via JWKS
- Refresh token support
- Scope enforcement on every API call (tasks app middleware)
- Tokens bound to specific client_id

### Tasks App Responsibilities
- Verify JWT signature + issuer via WorkOS JWKS on every request
- Return proper `WWW-Authenticate` header on 401 (with `resource_metadata` URL for auto-discovery)
- Enforce scopes per API route

---

## Implementation Order

```
1. WorkOS setup           — create AuthKit project, enable CIMD, configure dashboard
2. @opentools/spec        — add auth types to LlmDiscovery
3. apps/tasks/.well-known — add oauth-protected-resource & oauth-authorization-server endpoints
4. apps/tasks/.well-known — update llm.json to declare oauth2
5. apps/tasks/middleware   — bearer token validation via jose + WorkOS JWKS
6. apps/chat/cimd         — host CIMD document (/.well-known/oauth-client.json)
7. apps/chat/oauth        — OAuth2 client flow
   - Discover AS from llm.json
   - Initiate authorize redirect
   - Handle callback
   - Token exchange + storage
8. apps/chat/settings     — update UI for OAuth connect flow
9. apps/chat/tools        — pass OAuth token to tool execution
10. @opentools/ai-sdk     — return auth requirements from discovery
```

---

## Decisions Made

1. **Auth provider** — WorkOS AuthKit. Real production-grade AS with CIMD support. No custom OAuth AS needed.

2. **Discovery auth format** — Object format `{ type: "oauth2", ... }`. More extensible, we control both sides.

3. **User identity** — WorkOS handles user accounts and consent. Real users, real sessions.

4. **Token persistence** — Chat side: cookies or localStorage. Tasks side: stateless JWT validation (no token storage needed, WorkOS issues JWTs verified via JWKS).

5. **Scope granularity** — `tasks:read`, `tasks:write`, `tasks:delete`. Maps to `x-llm` approval levels.

6. **Backward compatibility** — Yes, keep API key auth alongside OAuth2 for dev/testing.

7. **HTTPS for local dev** — Allow `http://localhost` as exception (matches MCP spec behavior). Production requires HTTPS.

8. **WorkOS pricing** — 1M MAU free, no credit card needed. More than sufficient.

9. **Login flow** — WorkOS-hosted login (simpler). Can switch to Standalone Connect later if needed.

10. **Chat app deployment** — Vercel (serverless). OAuth state (PKCE verifier, state param) stored in encrypted cookies between redirect and callback.

11. **User LLM API keys** — stored in localStorage. Orthogonal to OAuth (OAuth tokens are per-connection to tool providers, LLM key is for the chat app itself). Security mitigations:
    - Show warning: "Use a temporary or scoped API key for testing. Delete it after."
    - Provide "Clear API key" button in settings UI
    - Key only sent directly to LLM provider (never logged, never sent elsewhere)
    - XSS is the main risk vector — acceptable for demo given no third-party scripts loaded

---

## References

- [IETF CIMD Draft](https://www.ietf.org/archive/id/draft-ietf-oauth-client-id-metadata-document-01.html)
- [MCP Auth Spec (Nov 2025 draft)](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [Aaron Parecki: MCP Auth Update Analysis](https://aaronparecki.com/2025/11/25/1/mcp-authorization-spec-update)
- [WorkOS: CIMD vs DCR](https://workos.com/blog/mcp-client-registration-cimd-vs-dcr)
- [WorkOS AuthKit MCP Docs](https://workos.com/docs/authkit/mcp) — primary integration guide
- [WorkOS AuthKit MCP + CIMD](https://workos.com/docs/authkit/mcp#enabling-client-id-metadata-document-cimd)
- [Better Auth MCP Plugin](https://better-auth.com/docs/plugins/mcp)
- [Better Auth CIMD Issue #7184](https://github.com/better-auth/better-auth/issues/7184)
- [RFC 7636: PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 9728: Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)
