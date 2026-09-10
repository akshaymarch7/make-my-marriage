# Make My Marriage — Project Status

**Last updated:** 2026-09-10

This is the ongoing record of major development milestones. Read it before
starting development and update it whenever a major feature is implemented or
materially changed. Product scope and architecture remain defined by the PRD,
System Design, Database Design, and API Design documents.

## Current position

The scaffold, public homepage, and account authentication are implemented.
Signup and login lead to a protected welcome screen backed by MongoDB sessions.
Homepage illustrations still use sample data. Wedding onboarding and management
remain future work. The user confirmed authentication testing and code review
are complete on 2026-09-10. Development continues one feature at a time.

| Milestone | Status | Recorded on |
| --- | --- | --- |
| Application scaffold | Complete — foundation only | 2026-09-10 |
| Public homepage | Complete — UI with mock data | 2026-09-10 |
| Account authentication | Complete — account scope tested and reviewed | 2026-09-10 |

Dates above record when progress was documented or verified, rather than
asserting the original creation date of earlier work.

## 1. Application scaffold

**Status:** Complete — foundation only

**Recorded on:** 2026-09-10

### Implemented

- Next.js App Router application with TypeScript, React, and Tailwind CSS.
- Routing and layout under `src/app`, infrastructure under `src/server`, and
  environment configuration under `src/config`.
- Reusable Mongoose connection helper and Zod environment validation.
- HTTP response/error helpers and secure token generation/HMAC-SHA-256 hashing
  utilities.
- Development, production build, Webpack build fallback, lint, typecheck, and
  Vitest scripts; focused tests for environment, token, and error utilities.
- Project requirements and development rules documented in `docs` and
  `AGENTS.md`.

### Validation

- Development server started successfully and the initial scaffold returned
  HTTP 200 at `/`.
- Initial scaffold was reviewed in the browser and confirmed working by the user.

### Boundaries

- Infrastructure helpers do not constitute working authentication or wedding
  management features.
- The scaffold browser check did not verify a live MongoDB connection or external
  provider integrations.
- Utility tests are present; this entry does not claim a fresh test run.

## 2. Public homepage

**Status:** Complete — UI with mock data

**Recorded on:** 2026-09-10

### Implemented

- Public homepage at `/`, based on the Stitch project
  “Make My Marriage SaaS Landing Page.”
- Burgundy, ivory, and muted gold styling, locally hosted Manrope and Playfair
  Display fonts, the supplied logo, and wedding imagery.
- Header, hero, sample wedding dashboard, planning overview, family roles,
  V1 feature cards, multi-event timeline, guest invitation/RSVP illustrations,
  photo-sharing section, theme previews, trust section, final call to action,
  and footer.
- Responsive layouts, mobile navigation including Sign In, section links,
  keyboard focus styles, a skip link, and reduced-motion support.
- Three local wedding-theme preview dialogs.
- Originally, Start Planning and Sign In opened availability messages. These
  were replaced by working account links in the authentication milestone.
- Homepage components under `src/components/home`; local illustrative data in
  `src/components/home/home-data.ts`; thin page entry in `src/app/page.tsx`.
- Removed design content outside V1, including accommodation, transport,
  budget allocation, granular roles, real-time updates, and custom domains.

### Validation

- Lint and TypeScript checks passed during implementation.
- Final production build passed using `npm run build:webpack`.
- Browser checks covered desktop and small-screen layouts, horizontal overflow,
  image loading, section navigation, mobile menu behaviour, planning messages,
  and theme dialogs. No browser warnings or errors were observed in that check.

### Remaining work and limitations

- The dashboard, invitations, RSVP, gallery, and QR illustration are marketing
  previews, not functioning domain features. No backend APIs or database flows
  were added for the homepage.
- Follow-up on 2026-09-10: Start Planning and Sign In now link to working signup
  and login screens, replacing the original availability messages.
- Sample social-proof figures, including “4,200+ couples” and “4.9/5,” were
  retained at the user's request for the development UI. Replace with verified
  figures or remove them before public launch.
- The final default Turbopack build encountered a local worker port permission
  error. The existing Webpack fallback succeeded; revisit the default build in
  an environment permitting its worker processes.
- This milestone was delivered through the local development preview; no
  production deployment was performed.

## 3. Account authentication

**Status:** Complete — account scope tested and reviewed

**Recorded on:** 2026-09-10

### Implemented

- Responsive `/signup` and `/login` screens matching the homepage palette,
  typography, and imagery; password visibility, pending states, and errors.
- Signup, login, logout, and current-user APIs with documented response shapes.
- MongoDB users, normalized unique email addresses, Argon2id password hashes,
  and server-side sessions. Cookie secrets are HMAC-hashed in MongoDB; cookies
  are HttpOnly, SameSite=Lax, and Secure in production, with a default 30-day
  lifetime. Expiration is checked on reads independently of TTL cleanup.
- Protected `/welcome` showing the signed-in user and a working sign-out action.
- Strict Zod validation, bounded JSON bodies, configured-origin mutation checks,
  no-store API responses, and persistent MongoDB rate limits.
- Account use cases live in `src/modules/auth`; session/password/HTTP mechanisms
  live in `src/server/auth`; route handlers remain thin.

### Validation

- Latest verification: all 28 tests, lint, TypeScript, and the production
  Webpack build passed after the manual-testing fixes.
- On 2026-09-10, the user confirmed testing and code review were complete and
  accepted the feature. The earlier pending browser acceptance checks are closed.
- Live development API checks passed for signup, normalized-email duplicates,
  invalid credentials, current user, protected welcome, cookie flags, cross-site
  request rejection, login, logout revocation, explicit expiry, and rate limiting.
  The temporary test account and its sessions were removed afterward.
- Signup checked at desktop and narrow mobile widths, with loaded images and no
  horizontal overflow; required-field focus and sign-in navigation verified.


### Boundaries and operational choices

- Manual-testing fixes on 2026-09-10: authenticated visits to `/login` and
  `/signup` now redirect server-side to `/welcome`. Welcome tabs revalidate
  `/api/auth/me` on a cross-tab session-change marker, focus, visibility return,
  and page restoration; a 401 hides stale content and redirects to sign-in.
  Storage contains only a random change marker, never credentials or user data.
  Storage-disabled browsers still revalidate when the tab is focused again.
  Passwords over 128 characters receive plain-language errors on both endpoints.
  Validation: 28 tests, lint, and TypeScript passed; live temporary-account checks
  verified redirects and both password messages. Client-effect regression tests
  cover cross-tab logout, focus fallback, listener cleanup, and network failures.
  The user subsequently confirmed completion of testing and code review.

- Logout fix on 2026-09-10: the browser sends an empty POST, which Next.js
  represents as a readable stream. The original parser incorrectly required
  JSON for that empty stream. Logout now accepts zero body bytes while retaining
  validation of nonempty bodies and origin checks. Four route regression cases
  were added (20 tests total pass), along with passing lint and TypeScript checks.
  Live verification using the button's empty-body request confirmed session
  deletion, cookie clearing, and rejection of the revoked session. The temporary
  verification account was removed.

- Wedding membership has not been implemented. `hasWedding` is currently false;
  `/me` returns null membership and wedding. Connect these to the membership
  module when wedding onboarding is built.
- Password reset/email delivery and email verification are not part of this
  increment. Passwords must be 12–128 characters when signing up.
- `NEXT_PUBLIC_APP_URL` must match the browser origin exactly. Set an HTTPS URL
  for production and configure MongoDB plus `AUTH_TOKEN_PEPPER` server-side.
- The new infrastructure collection `auth_rate_limits` provides atomic fixed
  windows with TTL cleanup: 10 attempts per normalized email per 15 minutes,
  plus shared ceilings of 30 signup / 60 login requests per minute. The shared
  ceiling avoids trusting client-supplied IP headers.
- Deferred on 2026-09-10 for local development or a small private V1 pilot:
  one caller can exhaust the shared signup/login quota, including with malformed
  requests, temporarily blocking authentication requests from everyone. This is
  an availability limitation, not an authentication bypass. Before opening public
  signups, replace the low shared ceiling with per-client limiting using a trusted
  proxy-provided IP or an edge limiter; retain the per-email limit. Add regression
  tests proving that one client's exhausted quota does not block another client.
  This fix remains unimplemented.
- If session creation fails after a user is saved, that account can subsequently
  sign in; signup intentionally does not require a multi-document transaction.
- No production deployment was performed.

## Upcoming development

The next suggested increment is wedding onboarding and the real
dashboard, member management, events, tasks, guests/invitations/RSVP, expenses
and vendors, wedding websites/livestream, and gallery sharing. These remain
future work; confirm the next small feature with the user before beginning it.

## Updating this document

- Update the current position, milestone table, and last-updated date when a
  major feature progresses.
- Add a numbered milestone for each new major feature. Record its status, date,
  implemented scope, validation actually performed, and remaining work.
- Update existing entries when their scope changes, preserving the earlier
  milestone and noting the date and substance of significant follow-up changes.
- Use explicit statuses such as **In progress**, **Complete — UI with mock data**,
  or **Complete — end to end**. Completion applies only to the stated scope.
- Keep entries concise and factual. Never include credentials, tokens, or
  private connection strings.
