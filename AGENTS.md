<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Make My Marriage project rules

- Treat `docs/PRD.md`, `docs/SYSTEM_DESIGN.md`, `docs/DATABASE_DESIGN.md`, and
  `docs/API_DESIGN.md` as the source of truth. Point out contradictions instead
  of silently creating a new convention.
- Read `docs/PROJECT_STATUS.md` before starting development to understand what
  is implemented and what remains. Keep it updated in the same change whenever
  a major feature is added or materially changed: record its status, date,
  implemented scope, validation, and remaining work or limitations. Preserve
  milestone history, distinguish mock UI from working backend features, and
  never mark unverified or partial work as complete. This document tracks
  progress; it does not override the four product and design documents above.
- Keep `src/app` limited to routing, layouts, pages, and thin HTTP/UI entry
  points. Route Handlers authenticate, authorize, validate, call a service,
  and map the result to HTTP.
- Keep business logic in `src/modules`. A module may own its Zod schemas,
  Mongoose model, repository, service, and types, but create only the layers an
  implemented feature needs.
- Keep server infrastructure in `src/server`, including database connections,
  authentication mechanics, authorization helpers, HTTP boundaries, and
  external-provider adapters.
- `src/modules/auth` owns authentication use cases such as signup and login.
  `src/server/auth` owns mechanisms such as password hashing, session cookies,
  token handling, and authenticated-request context.
- Keep Mongoose feature models inside their domain modules. Do not create a
  global models directory, import another module's model directly, or add
  generic repository interfaces/base repositories.
- Do not pre-create routes, folders, services, repositories, or interfaces for
  future features.
- Avoid a miscellaneous `lib` directory. Shared code must have a clear owner
  and purpose; prefer a named area under `server`, `config`, or `components`.
- Derive `weddingId` from the authenticated membership, never client input.
  Scope every Wedding-owned lookup by resource ID and `weddingId`, and return
  `NOT_FOUND` for cross-Wedding access.
- Validate every external body, query, and route parameter with Zod. Validate
  MongoDB ObjectId strings before querying.
- Use integer paise for money. Keep provider secrets and server code out of
  client bundles.
- Hash session, password-reset, and member-invitation tokens with HMAC-SHA-256
  and the server-only `AUTH_TOKEN_PEPPER`. Guest invitation and gallery tokens
  are stable, high-entropy share secrets per `API_DESIGN.md`; never log any
  token or signed upload URL.
- Do not introduce microservices, GraphQL, Redis, external queues, dependency
  injection frameworks, global state libraries, or new dependencies without
  an immediate documented need.
- Add focused tests for business rules, authorization, and tenant isolation as
  the corresponding feature is implemented.
