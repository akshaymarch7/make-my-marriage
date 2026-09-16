# Make My Marriage — Project Status

**Last updated:** 2026-09-16

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
wedding overview uses saved wedding details and members, with explicitly labelled
saved event and task summaries and explicitly labelled sample previews for the remaining
planning modules. The user accepted authentication on 2026-09-10.
The user accepted wedding onboarding and its review fixes on 2026-09-10.
Development continues one feature at a time. On 2026-09-16, the user accepted
the V1 workspace skeleton after testing and code review and authorized committing
and pushing it. On 2026-09-16, the user also accepted Wedding Events after
manual QA and code review, including the save-error fix, and authorized committing
and pushing it. On 2026-09-16, the user accepted Task Management after
code review and testing and authorized committing and pushing it. Other planning previews remain sample data.
On 2026-09-12, the user accepted member invitations, the signup-flow follow-up,
role changes, and member removal, and authorized committing and pushing the
source to GitHub. The implemented scope includes concurrent last-Admin protection.
The user has confirmed the app is live on Vercel, database connectivity and
invitation emails are working, and a custom domain is configured. These are
user-reported production results, not an independent production audit.

| Milestone | Status | Recorded on |
| --- | --- | --- |
| Application scaffold | Complete — foundation only | 2026-09-10 |
| Public homepage | Complete — UI with mock data | 2026-09-10 |
| Account authentication | Complete — account scope tested and reviewed | 2026-09-10 |
| Wedding onboarding and overview | Complete — implemented scope accepted | 2026-09-10 |
| Wedding detail editing | Complete — implemented scope accepted | 2026-09-11 |
| Wedding member invitations | Complete — implemented scope accepted | 2026-09-12 |
| Member roles and removal | Complete — implemented scope accepted | 2026-09-12 |
| Initial Vercel deployment and custom domain | Live — confirmed by user | 2026-09-15 |
| Wedding workspace skeleton | Complete — implemented scope accepted | 2026-09-15 |
| Wedding events | Complete — implemented scope accepted | 2026-09-16 |
| Wedding tasks | Complete — implemented scope accepted | 2026-09-16 |

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

## 6. Wedding member invitations

**Status:** Complete — implemented scope accepted

**Recorded on:** 2026-09-11

### Design references

Approved screens in Stitch project `5169674594013355245`:

- “V1 — Wedding Members” (`79a70c7a2fe14665a4098b88c6f2abe5`), including the
  nested Invite Wedding Member and Revoke Wedding Invitation dialogs.
- “V1 — Accept Wedding Invitation” (`544de539d95e466eab35e831427bf579`).
- Implemented responsive website layouts; design state-switcher controls and
  unbuilt footer links are omitted. Existing application logo/fonts are reused.

### Implemented

- Admin-only `/settings/members`, linked from the signed-in wedding header.
  Lists real member names/emails/roles and pending invitations; shows the current
  user, empty/loading/retry states, invite dialog, revoke confirmation, and
  success feedback. Failed sends retain entered email and role.
- Member listing API permits Admin and Manager reads, per API Design. Invitation
  administration and its UI remain Admin-only, per the PRD. Role editing and
  removal of existing members are outside this increment.
- Follow-up on 2026-09-12: role editing and member removal are implemented in
  milestone 7, reusing the Members page and dialog styling.
- Thin member-list, invitation-create/list/revoke, public invitation-read, and
  acceptance endpoints. All mutations check origin; routes validate bodies,
  queries, and parameters, authenticate where required, and return no-store
  responses. Wedding scope is derived from membership.
- Normalized email, Admin/Manager roles, seven-day expiry, HMAC-SHA-256 token
  hashes, and a unique pending invitation per wedding/email. Existing members
  and duplicate pending invitations receive clear errors. Replacement invites
  revoke expired pending records to release the unique index.
- Immediate Resend delivery through server-side fetch with a bounded timeout and
  per-invitation idempotency key. No new dependency, queue, or SDK was added.
  Missing email configuration fails before inserting an invitation; failed or
  uncertain delivery revokes that attempt so an Admin can retry.
- `/member-invitations/:token` shows only invited email, role, couple names, and
  wedding date. Includes signed-out, matching-account, wrong-email, existing
  wedding, accepting, success, invalid/revoked/expired/already-accepted, and retry
  states. Session changes are rechecked on focus and cross-tab signals.
- Login/signup preserve an allowlisted invitation return path. Switching from the
  wrong account signs out first. Acceptance is explicit and verifies normalized
  email, current membership, link status/expiry, and wedding existence.
- Manual-testing follow-up on 2026-09-12: signed-out recipients now see Create an
  account to join first, with Already have an account? Sign in alongside it.
  Login and signup prefill email from the validated invitation record, preserve
  the return destination, and use invitation-specific copy. Login explains that
  receiving an invitation does not create an account. No account-existence lookup
  is used to choose the email link or reveal registration status.
- Membership creation and invitation acceptance commit atomically; unique user
  membership prevents concurrent joins to different weddings. Revocation and
  acceptance use conditional writes, so revoked links cannot grant access.
- Tokens are omitted from ordinary API responses and browser storage. Local
  request logs suppress invitation paths/auth return URLs, and invitation/auth
  pages send a no-referrer policy.

### Validation

- 123 tests passed, including mounted React UI tests, API boundaries, invitation
  authorization/validation, public projection, email-adapter failure handling,
  retry behaviour, and invitation return-path validation. The five opt-in database
  tests are skipped by the ordinary test command and were run separately.
- Signup-guidance follow-up on 2026-09-12: 129 tests, TypeScript, lint, and the
  production Webpack build passed. New tests cover invitation-derived email
  prefill, safe handling of stale links, signup-first actions, retained guidance
  after failed login, and return to acceptance after signup or sign-in. The
  unchanged database integration tests were not rerun for this UI/auth change.
- All five live MongoDB integration tests passed with mocked email: concurrent
  duplicate invitations, tenant isolation, email mismatch, revocation, Manager
  permissions, simultaneous acceptance, attempts to join two weddings, expiry,
  replacement invitations, and failed-send cleanup/retry. Temporary data removed.
- TypeScript, lint, and the production Webpack build passed.
- Static fixtures rendered from the real React components checked at desktop and
  mobile widths for member lists, invitation/revocation dialogs, and acceptance.
  No horizontal overflow observed in the checked mobile previews. These checks
  do not claim interactive acceptance testing against a real mailbox.

### Remaining setup and boundaries

- At initial implementation, Resend was not configured locally. Follow-up on
  2026-09-12: the user reported receiving an invitation email, then encountered
  confusion signing in before creating an account. The UI follow-up addresses
  that path. The user subsequently accepted the feature on 2026-09-12.
- `NEXT_PUBLIC_APP_URL` must be accessible to recipients; localhost links cannot
  be used from another person's device. Configure production access logs and
  analytics to redact invitation secrets before deploying publicly.
- A provider timeout can occur after an email was accepted by Resend; a delayed
  message from a failed attempt may contain a revoked link. A process crash after
  inserting the invitation can leave it pending; an Admin can revoke and retry.
  There is no durable email job or automatic retry in this single-email flow.
- On 2026-09-12, the user accepted the feature and authorized publishing the
  source to GitHub. No production deployment was performed.
- During testing, the configured sender used resend.dev, which restricts ordinary
  recipients to the Resend account email. Sending to other users requires a
  verified owned domain. Delivery beyond that testing restriction has not been
  verified in this session; generic provider-error handling remains unchanged.

## 7. Member roles and removal

**Status:** Complete — implemented scope accepted

**Recorded on:** 2026-09-12

### Implemented

- Current member rows offer Change role and Remove member; the current user's
  removal action is labelled Leave wedding. Dialogs show the target name/email,
  explain permissions or access loss, require confirmation, disable pending
  actions, and retain errors for retry. The role selector starts with the current
  role and prevents an unchanged save.
- Admin-only `PATCH /api/members/:membershipId` and
  `DELETE /api/members/:membershipId`, with strict validation, origin checks,
  authenticated identity, and no-store responses. Targets are scoped by ID and
  the acting user's wedding; cross-wedding targets return NOT_FOUND.
- The last Admin cannot be demoted or removed. UI controls explain this rule;
  the database enforces it even with stale UI and simultaneous requests. Both
  operations first increment the Wedding's internal `__v` in a transaction,
  recheck the acting Admin's membership, then inspect/mutate the target and count
  Admins. This shared write prevents snapshot write-skew between different targets.
- Removal deletes only membership, leaving the user's account intact. Subsequent
  wedding requests use fresh membership and deny access. The user can be invited
  again. Self-removal opens onboarding; self-demotion returns to the overview.
- Session synchronization now detects changed membership roles as well as wedding
  and user identity. Old Admin content is hidden on revalidation before refresh;
  focus and cross-tab signals update open tabs. No real-time push was introduced.

### Validation

- Focused UI tests cover last-Admin controls, confirmation before removal, failure
  retention, self-demotion, and self-removal. API tests cover authentication,
  origin/parameter/query/body validation, identity forwarding, and no-store
  responses. Service tests cover role validation, ownership scoping, and Manager
  rejection; session tests cover hiding stale Admin controls.
- All 140 ordinary tests, TypeScript, lint, and the production Webpack build
  passed. The nine opt-in database tests were run separately, as recorded below.
- All nine live MongoDB integration tests passed, including the five invitation
  regressions and new checks for promotion/demotion, last-Admin errors, target
  isolation, removal/access loss, and concurrent self-demotions, self-removals,
  and mutual demotions. Each race preserved one Admin; stale acting Admin
  permission was rejected. Temporary data was removed and email was mocked.

### Boundaries

- On 2026-09-12, the user accepted this increment and authorized committing and
  pushing it. Open tabs discover remote changes on revalidation; already-rendered
  content is not remotely erased.
- Existing invitations and the wedding itself are not deleted by member removal.
  This increment does not add guest management, ownership transfer, or audit logs.
- No production deployment was performed.

## 8. Initial production deployment

**Status:** Live — confirmed by user

**Recorded on:** 2026-09-15

- The user deployed the app to Vercel and confirmed working database connections,
  invitation email delivery, and the production application. A custom domain is
  now configured; its address has not been supplied in this conversation.
- Deployment troubleshooting covered the exact application origin setting,
  Atlas network access, and hosted Resend configuration. The user reported
  allowing all IP addresses in Atlas to resolve connectivity.
- Earlier milestone statements about no deployment describe their delivery at
  that time and are superseded by this deployment milestone. This entry records
  user confirmation; no independent production audit or new test run is claimed.
- Existing public-launch limitations, including shared authentication rate limits
  and sample homepage claims, remain documented above. Future development and
  database resets must be isolated from production data.

## 9. Wedding workspace skeleton

**Status:** Complete — implemented scope accepted

**Recorded on:** 2026-09-15

- Adapted the Stitch wedding workspace design to V1: shared desktop sidebar,
  mobile navigation drawer, account header, and dashboard. Wedding editing and
  member management now use the same shell; onboarding retains its existing flow.
- Wedding identity, date, time zone, location, description, countdown, and member
  names come from saved data. Member lookups use the existing authenticated,
  wedding-scoped service; only names, IDs, and roles reach the dashboard.
- Navigation includes events, tasks, guests, invitations/RSVP, expenses, selected
  vendors, vendor discovery, website, gallery, guest QR, and livestream. Unbuilt
  sections open an accessible Coming soon dialog. No future routes, APIs, or
  persistence layers were created.
- Dashboard summaries, event/task previews, RSVP distribution, and expenses are
  clearly labelled sample data. They do not write records or send invitations.
  Existing edit and Admin-only member-management links remain functional.
- Excluded non-V1 design features, including seating/room allocation, transport,
  WhatsApp concierge, budget allocation, vendor contract management, and exports.
- All 144 ordinary tests, lint, TypeScript, and the production Webpack build passed.
  Tests include role-aware navigation, every placeholder dialog, mobile drawer
  transitions, absence of placeholder network requests, real/sample separation,
  and refreshed countdown behaviour. Nine opt-in database tests were not run.
- Desktop and mobile presentation checked using an isolated rendering of the
  actual components with fixture data. The local authenticated browser session
  was unavailable during that visual check. After restarting the local dev server
  with updated environment values, the user confirmed login worked; server logs
  showed successful login, dashboard, and session responses. On 2026-09-16, the
  user confirmed testing and code review passed and accepted the feature.
- On 2026-09-16, removed the repetitive wedding-name card from the desktop
  sidebar and mobile navigation at the user’s request. Wedding names remain
  in the dashboard heading.
- TypeScript and the three workspace tests also passed after the sidebar change.
- The user authorized committing and pushing this increment on 2026-09-16.
  No production deployment verification is claimed; connected Vercel deployments
  may be triggered by the GitHub push.

## 10. Wedding events

**Status:** Complete — implemented scope accepted

**Recorded on:** 2026-09-16

- Retrieved the approved Stitch List, Empty State, and Create screens. Implemented
  responsive list, creation, details, editing, archive confirmation, and unsaved
  changes flows in the existing workspace. Details/edit/dialogs follow the same
  visual language. Prototype controls and features outside V1 were omitted.
- Admins and Managers can create, list, read, update, and archive events through
  `/api/events` and `/api/events/:eventId`. Membership determines the wedding;
  IDs, queries, and bodies are validated. Repositories scope every resource by
  wedding ID and event ID. Cross-wedding requests return NOT_FOUND.
- Events support a name, optional preset/custom type, start and optional end,
  venue, address, description, and dress code. Type remains optional in the API
  per the database design; the UI defaults to Custom. No cover uploads yet.
- Dates are stored as UTC instants and entered/displayed in the wedding time zone.
  Overnight events work. The form rejects nonexistent/ambiguous daylight-saving
  times rather than silently moving them. Unchanged timestamps retain precision.
- Lists group by local date and order chronologically. Archived events are hidden
  by default, optionally visible, and read-only. Archiving preserves records and
  references; no hard-delete or restore capability was added.
- Partial edits validate the resulting start/end pair. An atomic version check
  rejects a concurrent update/archive during saving. The form sends only changed
  fields. API failures retain input; session expiry retains the draft in the open
  tab through reauthentication, and account/wedding changes discard it. Drafts
  are not persisted across closing or refreshing the tab.
- The sidebar Events link is active. Dashboard event count and upcoming events
  now use saved data, with a real empty state. Other dashboard modules retain
  explicitly labelled samples. Existing focus/cross-tab refresh signals update
  event views and dashboard data.
- All 174 ordinary tests, TypeScript, lint, and the production Webpack build
  passed. Coverage includes validation, timezone/DST conversion, tenant-scoped
  queries, auth/origin boundaries, archive behaviour, concurrent-write guards,
  partial form updates, draft retention, empty states, and dashboard summaries.
- Browser checks used the actual components in an isolated in-memory fixture:
  list, create, details, edit, archive, and unsaved confirmation; desktop/mobile
  layout and mobile horizontal overflow were checked. No database integration
  tests or production-data mutations were performed. Nine existing opt-in
  database tests remain skipped. The user subsequently confirmed that manual QA
  and code review passed and accepted the implemented feature on 2026-09-16.
- Save troubleshooting on 2026-09-16: the long-running dev server returned HTML
  404 responses for `/api/events` despite the route being present in the production
  build. Restarting it restored the expected JSON authentication response. The form
  now distinguishes unexpected server responses from connection failures, retains
  input, and avoids claiming success when no saved event is returned. Nine focused
  event-form tests, TypeScript, and lint passed after this fix.
- No new dependencies, uploads, invitations, task/guest/vendor associations, or
  other future modules were introduced.
- The user authorized committing and pushing this increment on 2026-09-16.
  No production deployment verification is claimed; a connected Vercel deployment
  may be triggered by the GitHub push.

## 11. Wedding tasks

**Status:** Complete — implemented scope accepted

**Recorded on:** 2026-09-16

- Used the approved Stitch task list, filtered/completed, and delete/error states.
  Create/edit/details follow the existing Events forms. Responsive website UI
  includes task lists, empty states, filters, pagination, details, editing,
  inline status updates, permanent deletion confirmation, and retryable errors.
- Admins and Managers can manage tasks at `/tasks`, `/api/tasks`, and
  `/api/tasks/:taskId`. Every lookup/write is wedding-scoped; IDs, queries and
  bodies are validated. Assignees are current wedding memberships; new event
  links require active events in the same wedding. Existing archived-event and
  former-member context stays visible and can be retained or cleared.
- Fields: title, optional description, single member, optional event and due date,
  priority, and status. All Tasks/My Tasks/Completed views support status,
  priority, member and event filters, including unassigned/general tasks.
- Due dates are entered/displayed in the wedding timezone and stored as UTC.
  Overdue starts after the due calendar day. Completed timestamps are set on
  completion, preserved during metadata edits, and cleared on reopening.
  Optimistic version checks reject writes racing with another update.
- The sidebar Tasks link and dashboard task totals/nearest-due incomplete tasks
  now use saved data. Empty and all-completed summaries replace task fixtures.
  Other unimplemented modules retain labelled samples. Existing focus and
  cross-tab signals refresh task views and dashboard summaries.
- Forms retain input after failures and through session expiry/reauthentication
  in the same open tab. Account or wedding changes discard the draft. Unsaved
  changes require confirmation before leaving; reload/close does not persist it.
- Validation: 214 ordinary tests, TypeScript, lint, and production Webpack build
  passed. Coverage includes scoping, reference validation, completion transitions,
  concurrent updates, filters/pagination, auth/origin boundaries, form failure and
  session retention, deletion confirmation, and saved dashboard summaries.
- Browser checks used actual components with isolated in-memory fixtures:
  desktop list and creation, My Tasks, mobile details/edit/delete and unsaved
  confirmation. Mobile list had no horizontal overflow. No configured database
  mutations were made for these checks; nine opt-in database tests remain skipped.
  The local server was restarted, and `/api/tasks` returned the expected no-store
  JSON 401 authentication response. On 2026-09-16, the user confirmed testing
  and code review were complete and accepted the feature.
- API implementation details are recorded in `API_DESIGN.md`. No new dependencies,
  comments, attachments, subtasks, reminders, or other future features were added.
  The user authorized committing and pushing this increment on 2026-09-16.
  No production deployment verification is claimed; a connected Vercel deployment
  may be triggered by the GitHub push.

## Upcoming development

Task Management is accepted. Plan Guest Management next: guest list, details,
create/edit/delete, party-size limits, event selection, search and filters, and
saved guest totals. Finalise responsive Stitch designs before implementation.
Keep invitation sharing/email delivery and public RSVP as subsequent increments. Continue
with expenses and vendors, wedding website/livestream, and gallery sharing one
feature at a time. Event cover uploads remain a separate deferred increment.

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
