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

## Architecture

- `src/app` contains routes and thin HTTP/UI entry points.
- `src/modules` contains business features as they are implemented. Domain
  models stay with their feature; layers are added only when needed.
- `src/server` contains server infrastructure such as database connections,
  authentication mechanics, authorization helpers, HTTP responses, and
  provider adapters.
- `src/config` contains validated application configuration.
- `src/components` will contain shared UI and layout components when the first
  product screen needs them.

`modules/auth` will own authentication use cases and business workflows.
`server/auth` owns lower-level authentication mechanisms such as password
hashing, session cookies, and token utilities.

Environment variables are validated by subsystem so a feature requires only
its own configuration. Add provider-specific accessors when implementing the
provider rather than expanding a single global environment parser.

Read the documents in `docs/` before changing product behavior or architecture.
