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

Admins and Managers can open **Edit wedding** from the overview to update saved
details at `/wedding/edit`. Saving returns to the overview with a confirmation.
Unsaved changes receive a discard warning; expired sessions retain the form while
the same user signs in in another tab. Drafts are held only in that tab's memory.

Admins can open **Wedding members** in the signed-in header to view members and
pending invitations at `/settings/members`, invite Admins or Managers, and revoke
pending invitations. Recipients follow `/member-invitations/:token`, sign in or
create an account with the invited email, and explicitly accept the invitation.
Authentication preserves the invitation destination rather than starting onboarding.

Invitation email requires `RESEND_API_KEY` and `RESEND_FROM_EMAIL` with a verified
sender in `.env.local`. `NEXT_PUBLIC_APP_URL` supplies the link origin; localhost
links work only on the computer running the app. Use the publicly accessible app
URL when testing with other people. The [Resend email API](https://resend.com/docs/api-reference/emails/send-email)
is called directly through server-side fetch; no SDK or queue is required.

Invitations expire after seven days. Only HMAC hashes of invitation tokens are
stored. A failed or uncertain send revokes that attempt so the Admin can retry;
if a delayed email arrives from the failed attempt, its link may be invalid.
Expired pending records are revoked when a replacement is created. Acceptance
uses a transaction and unique membership constraints to prevent joining twice.
Admins can change existing members between Admin and Manager or remove them,
with confirmation dialogs. The last Admin cannot be demoted or removed: promote
another member first. Admins may change their own role or leave when another
Admin remains. Removal deletes the membership, not the account, and subsequent
wedding requests are denied. Open tabs refresh membership and role on focus or
session-change signals; there is no real-time push notification.

Role changes/removals serialize on a shared Wedding version write inside a
MongoDB transaction before rechecking permissions and counting Admins. This
prevents concurrent requests from leaving the wedding without an Admin.

Invitation paths and auth return URLs contain share secrets: application code
does not log them, and development request logs suppress these paths. Configure
production proxy/access logging and analytics to omit or redact them as well.
Invitation and auth pages use a no-referrer policy.

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

The invitation integration tests are opt-in because they write temporary records
to the configured MongoDB database. They always mock email delivery and remove
their temporary users, weddings, memberships, and invitations afterward:

```bash
TEST_MEMBERS_DB=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run src/modules/memberships/invitations.integration.test.ts
```

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

`modules/weddings` owns wedding creation, reading, and partial updates. `modules/memberships`
owns the membership records that determine wedding access. Creation writes both
records in one transaction, with a unique user membership enforced by MongoDB.
`modules/memberships` also owns member invitations and atomic acceptance.
`server/email` owns the Resend adapter for immediate invitation delivery.

Environment variables are validated by subsystem so a feature requires only
its own configuration. Add provider-specific accessors when implementing the
provider rather than expanding a single global environment parser.

Read the documents in `docs/` before changing product behavior or architecture.
