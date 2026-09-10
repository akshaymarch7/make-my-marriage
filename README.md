# Make My Marriage

Make My Marriage is a production-oriented wedding planning SaaS application
for couples and families organising Indian weddings.

## Local setup

Requirements: Node.js 20.9 or later and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

The application is available at `http://localhost:3000` by default.

Set `MONGODB_URI`, `MONGODB_DB_NAME`, and a server-only `AUTH_TOKEN_PEPPER`
(at least 32 characters) in the gitignored `.env.local`. `NEXT_PUBLIC_APP_URL`
must match the browser origin. Wedding creation uses a MongoDB transaction:
use MongoDB Atlas or a replica set, not a standalone MongoDB server.

After signing in, users without a wedding reach `/onboarding`. Creating a wedding
also creates their Admin membership and opens `/dashboard`, the initial wedding
overview. The old `/welcome` URL redirects to the appropriate destination.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Development and production builds use Next.js's default Turbopack bundler.
`npm run build:webpack` is available as a local compatibility fallback.

Tests use Vitest. `happy-dom` is a development-only dependency for mounting real
React forms in session-expiry regression tests, so draft retention and account
switching are checked across component updates rather than mocked hook calls.

## Architecture

- `src/app` contains routes and thin HTTP/UI entry points.
- `src/modules` contains business features as they are implemented. Domain
  models stay with their feature; layers are added only when needed.
- `src/server` contains server infrastructure such as database connections,
  authentication mechanics, authorization helpers, HTTP responses, and
  provider adapters.
- `src/config` contains validated application configuration.
- `src/components` contains the homepage, account screens, and wedding UI.

`modules/auth` owns authentication use cases and business workflows.
`server/auth` owns lower-level authentication mechanisms such as password
hashing, session cookies, and token utilities.

`modules/weddings` owns wedding creation and reading. `modules/memberships`
owns the membership records that determine wedding access. Creation writes both
records in one transaction, with a unique user membership enforced by MongoDB.

Environment variables are validated by subsystem so a feature requires only
its own configuration. Add provider-specific accessors when implementing the
provider rather than expanding a single global environment parser.

Read the documents in `docs/` before changing product behavior or architecture.
