# Make My Marriage — Project Status

**Last updated:** 2026-09-11

This is the ongoing record of major development milestones. Read it before
starting development and update it whenever a major feature is implemented or
materially changed. Product scope and architecture remain defined by the PRD,
System Design, Database Design, and API Design documents.

## Current position

The scaffold, public homepage, authentication, wedding onboarding, and wedding
detail editing are implemented. The user accepted the editing increment and
follow-up fixes and authorized publishing the source on 2026-09-11.
Signup and login lead to onboarding or the wedding overview,
depending on membership. Homepage illustrations still use sample data; the
wedding overview uses saved data. The user accepted authentication on 2026-09-10.
The user accepted wedding onboarding and its review fixes on 2026-09-10.
Development continues one feature at a time.

| Milestone | Status | Recorded on |
| --- | --- | --- |
| Application scaffold | Complete — foundation only | 2026-09-10 |
| Public homepage | Complete — UI with mock data | 2026-09-10 |
| Account authentication | Complete — account scope tested and reviewed | 2026-09-10 |
| Wedding onboarding and overview | Complete — implemented scope accepted | 2026-09-10 |
| Wedding detail editing | Complete — implemented scope accepted | 2026-09-11 |

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
- Follow-up on 2026-09-11: homepage actions now reflect the current session on
  the initial server render. Signed-out visitors retain Sign In/Start Planning;
  signed-in visitors see Continue setup or Go to your wedding. Desktop header,
  mobile menu, hero, and final planning actions share this state. Existing
  session-change, focus, visibility, and page-restoration listeners revalidate
  actions without redirecting away from the homepage. Network failures retain
  the last known state.
- Homepage components under `src/components/home`; local illustrative data in
  `src/components/home/home-data.ts`; thin page entry in `src/app/page.tsx`.
- Removed design content outside V1, including accommodation, transport,
  budget allocation, granular roles, real-time updates, and custom domains.

### Validation

- Lint and TypeScript checks passed during implementation.
- Final production build passed using `npm run build:webpack`.
- Homepage session follow-up: all 87 tests, lint, TypeScript, and the Webpack
  production build passed. Focused tests cover server-provided initial states,
  desktop/mobile actions, cross-tab login/logout, wedding creation, network
  failure, and listener cleanup. The user accepted this follow-up and authorized
  committing and pushing it on 2026-09-11.
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

- Follow-up on 2026-09-10: wedding onboarding now supplies real membership and
  wedding context. Login reports actual `hasWedding`; `/me` returns the role and
  a wedding summary. `/welcome` redirects to onboarding or the overview.
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

## 4. Wedding onboarding and overview

**Status:** Complete — implemented scope accepted

**Recorded on:** 2026-09-10

### Design references

The user approved these screens in Stitch project `5169674594013355245`:

- “V1 — Wedding Onboarding — Desktop” (`488c0256e8f3409d83b923fc63d2bd6b`).
- “V1 — Wedding Onboarding — Mobile” (`87876a92da0942249fb60a7814e48fec`).
- “V1 — Wedding Overview — Desktop” (`0437561737dd4e3e846f84bc08dc41e5`).
- “V1 — Wedding Overview — Mobile” (`0307d6983d9d4361a4a7fede90490c9a`).

### Implemented

- `/onboarding`: responsive single-page form for required names, calendar date,
  and manual location; optional title/description; selectable time zone defaulting
  to Asia/Kolkata. Title suggestion, inline errors, first-invalid-field focus,
  disabled submitting state, retry messaging, and retained values after failures.
- `/dashboard`: saved names/title, wedding date, time-zone-aware countdown,
  location, time zone, description, signed-in user and role, and sign out. This is
  the initial overview, not the future aggregate management dashboard.
- Thin authenticated `POST /api/wedding` and `GET /api/wedding` routes with strict
  body/query validation, origin checks, and no-store responses.
- Wedding and initial Admin membership created in a MongoDB transaction. Unique
  membership indexes enforce one wedding per user, including concurrent requests.
- Unique stable website slug with collision handling; stable high-entropy gallery
  share secret, omitted from ordinary responses. API Design section 108 and
  AGENTS.md explicitly supersede the older database `gallery.tokenHash` field:
  the implementation stores `gallery.token` with a unique index and hidden selection.
- Auth routing reflects membership, and other tabs refresh when a wedding is
  created. Logout authenticates independently of wedding availability.
- Review follow-up on 2026-09-10: onboarding has its own session boundary. An
  expired session keeps the form mounted and disables submission, with a sign-in
  link that opens another tab. Reauthentication as the same user resumes the
  retained draft; a different user or an existing wedding unmounts it before
  navigation. Identity is rechecked before submitting. Overview pages retain
  their normal expired-session redirect behaviour.
- Local fonts/logo and decorative SVG arches. Stitch state-example boards become
  real form states; unbuilt footer links and promises about future features are
  omitted. No user wedding details are prefilled with the design's sample data.

### Validation

- Latest verification: 58 tests, lint, and TypeScript checks passed. Production
  Webpack build passed. Five additional real React component tests cover draft
  retention on focus expiry, same-user recovery, different-user clearing, expiry
  during submission, pre-submit identity checks, and network-failure recovery.
  `happy-dom` was added as a development-only dependency to test mounted form
  state, rather than relying on mocked React hooks for this regression.
- Live development checks passed for routing, invalid input, concurrent creation
  (one wedding and one Admin membership), duplicate rejection, slug collisions,
  cross-user isolation, omission of share secrets, persisted overview data,
  membership after logout/login, and unauthenticated protection. Temporary users,
  weddings, memberships, and sessions were removed after verification.
- Desktop and mobile layouts checked using rendered responses from the temporary
  accounts, with no horizontal overflow. The visual preview used static responses;
  it does not substitute for interactive browser acceptance testing.
- On 2026-09-10, the user accepted this increment after reviewing the feature
  and the session-expiry draft-retention fix, and authorized committing and
  pushing it to GitHub. Earlier pending acceptance work is closed.

### Boundaries

- Requires MongoDB Atlas or a replica set for transactions; no standalone-server
  fallback that could leave an orphan wedding.
- Onboarding drafts stay only in the original tab's React state. Reloading,
  closing, or deliberately navigating away from the tab discards the draft;
  nothing is persisted to browser storage. The expiry notice explains this.
- Dates are stored as `YYYY-MM-DD`, with a named time zone. Past dates are permitted
  and receive a “Celebrated … ago” label; today gets a wedding-day label.
- Website starts unpublished with the Classic theme. Gallery, guest uploads, and
  livestream start disabled. These are initial settings, not implemented features.
- Wedding editing, cover uploads, Places autocomplete, member invitations, and
  aggregate dashboard metrics remain separate increments. No `/api/dashboard`
  aggregation or future feature routes were added.
- Follow-up on 2026-09-11: wedding editing is implemented in milestone 5. Creation
  and editing now share the wedding-details form and draft session boundary;
  onboarding retains its existing expiry and account-switch protection.
- This milestone is delivered through the local development preview. Publishing
  the source to GitHub does not constitute a production deployment.

## 5. Wedding detail editing

**Status:** Complete — implemented scope accepted

**Recorded on:** 2026-09-11

### Implemented

- Based on the user-approved “V1 — Edit Wedding” screen
  (`5a07cbd146ca4f49bdce1ced27d86d71`) in Stitch project
  `5169674594013355245`, with a responsive layout matching onboarding.
- Overview links to `/wedding/edit`, prefilled with saved names, date, location,
  optional title/description, and time zone. Includes title suggestion, optional
  text clearing, validation, save progress, retry errors, and a saved confirmation
  on return to the overview.
- Authenticated `PATCH /api/wedding` permits Admin and Manager membership roles,
  derives wedding ownership from the current membership, and validates partial
  updates. The design's Admin-only wording is adjusted to match API permissions.
- The form sends only changed fields. API location patches preserve omitted
  nested fields; changing the manual location in the form explicitly clears
  obsolete structured address/coordinate metadata. Slug and gallery token stay
  unchanged and are not editable through this endpoint.
- Cancel, in-app navigation, and sign out confirm before discarding changes.
  Refresh/close use the browser's native warning; the overview enters editing
  through document navigation so browser Back also crosses that boundary.
- Session expiry retains and disables the mounted draft. Signing in as the same
  user in another tab resumes editing; changing identity or wedding clears the
  form before navigation. Saving rechecks identity. Other overview tabs refresh
  saved details on session-change signals or focus.
- Review fix on 2026-09-11: the overview keys its countdown by wedding date and
  time zone so refreshed details reset the countdown immediately. Regression
  tests update both fields without remounting the overview or advancing timers.

### Validation

- All 79 tests, lint, TypeScript, and the production Webpack build passed.
  Tests cover partial validation, membership authorization, missing weddings,
  real form state, changed-field submissions, failure retention, discard guards,
  and session expiry/recovery. Existing onboarding and authentication tests pass.
- Live development API checks verified persisted updates, optional text clearing,
  nested field preservation, Admin/Manager access, unauthenticated rejection,
  wedding isolation, protected-field rejection, and unchanged slug/gallery token.
  Saved edit and overview responses were checked. Temporary test data was removed.
- Desktop and mobile static response previews checked for layout and horizontal
  overflow. These checks and component tests do not replace manual interactive
  acceptance testing. On 2026-09-11, the user accepted this increment and its
  review fixes and authorized committing and pushing the source to GitHub.
- Final regression verification after the countdown fix: all 89 tests,
  TypeScript, and lint passed. The production Webpack build also passed for the
  final increment before publication.

### Boundaries

- Drafts remain in memory in the original tab; there is no recovery after a
  confirmed reload, close, or departure. Native unload warnings depend on browser
  support and user interaction.
- Concurrent updates use last-write-wins for each submitted field; there is no
  version conflict interface in this increment.
- Cover uploads, Places autocomplete, invitations, and aggregate dashboard
  metrics remain separate features. No production deployment was performed.

## Upcoming development

Consider member invitations as the next small
increment, followed by events, tasks, guests/invitations/RSVP, expenses
and vendors, wedding websites/livestream, and gallery sharing. Dashboard summaries
can grow as those features become available. Confirm each increment before work.

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
