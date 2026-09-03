# Make My Marriage
## REST API Design Document

**Version:** V1  
**Architecture:** Modular Monolith  
**Backend:** Next.js Route Handlers + Node.js  
**API Style:** REST  
**Authentication:** Custom server-side sessions  
**Validation:** Zod  
**Database:** MongoDB Atlas + Mongoose  
**Status:** API Design Baseline

---

# 1. Purpose

This document defines the REST API design for **Make My Marriage V1**.

It covers:

- API conventions
- Authentication
- Authorization
- Request and response structures
- Error format
- Pagination
- Filtering
- Wedding APIs
- Member-management APIs
- Event APIs
- Task APIs
- Guest APIs
- Invitation and RSVP APIs
- Expense APIs
- Vendor APIs
- Wedding website APIs
- Gallery and photo APIs
- Livestream APIs
- Background email APIs
- Internal cron APIs

The API layer should remain thin.

The general request flow is:

```text
HTTP Request
    ↓
Route Handler
    ↓
Authentication
    ↓
Authorization
    ↓
Zod Validation
    ↓
Service Layer
    ↓
Mongoose / External Provider
    ↓
HTTP Response
```

---

# 2. API Design Principles

## 2.1 Explicit REST APIs

Even though frontend and backend live inside the same Next.js application, major application operations should use explicit backend endpoints.

This gives us:

- Clear frontend/backend boundaries
- Easier testing
- Easier debugging
- Better security review
- Potential future mobile-client compatibility
- Clearer educational architecture

---

## 2.2 Thin Route Handlers

Route handlers should not contain major business logic.

Example:

```text
POST /api/tasks
```

should roughly:

```text
Authenticate
↓
Resolve Wedding
↓
Validate Body
↓
TaskService.createTask(...)
↓
Return Response
```

The route should not directly implement every business rule.

---

## 2.3 Wedding Context Comes From Authentication

For private APIs, do not trust:

```text
weddingId
```

sent by the client.

The backend determines the current Wedding through:

```text
Session
   ↓
User
   ↓
Wedding Membership
   ↓
Wedding
```

Therefore private requests generally do not contain `weddingId`.

---

# 3. API Base Path

All application APIs use:

```text
/api
```

Example:

```text
/api/auth/login
/api/events
/api/guests
```

No `/api/v1` prefix is required initially.

If a public external API is introduced later, explicit versioning can be added then.

---

# 4. API Surface Categories

There are four categories.

```text
/api/auth/*
```

Authentication endpoints.

```text
/api/*
```

Authenticated Wedding Member APIs.

```text
/api/public/*
```

Unauthenticated public/token-protected APIs.

```text
/api/internal/*
```

System-only APIs such as cron processing.

---

# 5. HTTP Method Conventions

Use:

```text
GET
```

Read data.

```text
POST
```

Create a resource or trigger an action.

```text
PATCH
```

Partially update a resource.

```text
DELETE
```

Delete/archive a resource.

We will generally avoid `PUT` because most application updates are partial.

---

# 6. Successful Response Format

For individual resources:

```json
{
  "data": {
    "...": "..."
  }
}
```

For collections:

```json
{
  "data": [
    {},
    {}
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 186,
    "totalPages": 4
  }
}
```

For action endpoints where no resource needs returning:

```json
{
  "success": true
}
```

---

# 7. Error Response Format

All APIs should use a consistent error structure.

Example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "email": "Invalid email address"
    }
  }
}
```

---

# 8. Standard Error Codes

Recommended application codes:

```text
VALIDATION_ERROR

UNAUTHENTICATED

FORBIDDEN

NOT_FOUND

CONFLICT

INVALID_TOKEN

TOKEN_EXPIRED

RATE_LIMITED

UPLOAD_ERROR

EXTERNAL_SERVICE_ERROR

INTERNAL_ERROR
```

Business-specific codes may additionally exist.

Examples:

```text
EMAIL_ALREADY_EXISTS

ALREADY_HAS_WEDDING

LAST_ADMIN

GUEST_LIMIT_EXCEEDED

INVITATION_ALREADY_ACCEPTED
```

---

# 9. HTTP Status Codes

Use normal HTTP semantics.

```text
200 OK
```

Successful read/update/action.

```text
201 Created
```

Resource created.

```text
204 No Content
```

Successful deletion where response body is unnecessary.

```text
400 Bad Request
```

Malformed/invalid input.

```text
401 Unauthorized
```

No valid authentication session.

```text
403 Forbidden
```

Authenticated but insufficient permission.

```text
404 Not Found
```

Resource unavailable or inaccessible.

```text
409 Conflict
```

Business-state conflict.

```text
429 Too Many Requests
```

Rate limit exceeded.

```text
500 Internal Server Error
```

Unexpected application error.

```text
502/503
```

May be used when an external provider is temporarily unavailable.

---

# 10. Authentication Cookie

After signup/login, backend sets a secure cookie.

Example conceptual name:

```text
mmm_session
```

Properties:

```text
HttpOnly
Secure in production
SameSite=Lax
Path=/
```

The frontend should not access the token using JavaScript.

Browser automatically sends the cookie with authenticated requests.

---

# 11. Authentication APIs

## POST `/api/auth/signup`

Creates an account and authenticated session.

### Request

```json
{
  "name": "Akshay Saini",
  "email": "akshay@example.com",
  "password": "strong-password"
}
```

### Behaviour

```text
Validate input
↓
Normalize email
↓
Check duplicate account
↓
Hash password
↓
Create User
↓
Create Session
↓
Set Cookie
```

### Response

```json
{
  "data": {
    "user": {
      "id": "userId",
      "name": "Akshay Saini",
      "email": "akshay@example.com"
    },
    "hasWedding": false
  }
}
```

### Errors

```text
VALIDATION_ERROR
EMAIL_ALREADY_EXISTS
```

No email verification occurs.

---

# 12. Login

## POST `/api/auth/login`

### Request

```json
{
  "email": "akshay@example.com",
  "password": "password"
}
```

### Response

```json
{
  "data": {
    "user": {
      "id": "userId",
      "name": "Akshay Saini",
      "email": "akshay@example.com"
    },
    "hasWedding": true
  }
}
```

Backend sets session cookie.

Invalid credentials should return a generic message.

Avoid:

```text
"This email exists but password is wrong."
```

Prefer:

```text
"Invalid email or password."
```

---

# 13. Logout

## POST `/api/auth/logout`

Requires authentication.

### Behaviour

```text
Delete/invalidate session
↓
Clear cookie
```

### Response

```json
{
  "success": true
}
```

---

# 14. Current User

## GET `/api/auth/me`

Returns current authenticated user and Wedding membership information.

### Response

```json
{
  "data": {
    "user": {
      "id": "userId",
      "name": "Akshay Saini",
      "email": "akshay@example.com"
    },
    "membership": {
      "role": "ADMIN"
    },
    "wedding": {
      "id": "weddingId",
      "brideName": "Princi",
      "groomName": "Akshay",
      "weddingDate": "2027-02-14"
    }
  }
}
```

If user does not yet belong to a Wedding:

```json
{
  "data": {
    "user": {
      "id": "userId",
      "name": "Akshay Saini",
      "email": "akshay@example.com"
    },
    "membership": null,
    "wedding": null
  }
}
```

---

# 15. Forgot Password

## POST `/api/auth/forgot-password`

### Request

```json
{
  "email": "akshay@example.com"
}
```

### Response

Always return a generic success response:

```json
{
  "success": true
}
```

Do not reveal whether the account exists.

If account exists:

```text
Generate Reset Token
↓
Store Token Hash
↓
Send Email through Resend
```

---

# 16. Reset Password

## POST `/api/auth/reset-password`

### Request

```json
{
  "token": "raw-reset-token",
  "password": "new-password"
}
```

### Response

```json
{
  "success": true
}
```

### Possible Errors

```text
INVALID_TOKEN
TOKEN_EXPIRED
VALIDATION_ERROR
```

---

# 17. Wedding Creation

## POST `/api/wedding`

Authentication required.

Only users without an existing Wedding Membership can use this endpoint.

### Request

```json
{
  "brideName": "Princi",
  "groomName": "Akshay",
  "title": "Akshay & Princi",
  "description": "We are getting married!",
  "weddingDate": "2027-02-14",
  "timeZone": "Asia/Kolkata",
  "location": {
    "formattedAddress": "Dehradun, Uttarakhand, India",
    "city": "Dehradun",
    "state": "Uttarakhand",
    "country": "India",
    "latitude": 30.3165,
    "longitude": 78.0322,
    "googlePlaceId": "..."
  }
}
```

### Behaviour

Atomically:

```text
Create Wedding
+
Create ADMIN Wedding Membership
```

Also generate:

```text
website.slug
gallery token
```

### Response

```json
{
  "data": {
    "id": "weddingId",
    "brideName": "Princi",
    "groomName": "Akshay",
    "weddingDate": "2027-02-14",
    "website": {
      "slug": "princi-akshay-14022027"
    }
  }
}
```

### Errors

```text
ALREADY_HAS_WEDDING
VALIDATION_ERROR
```

---

# 18. Get Wedding

## GET `/api/wedding`

Authentication required.

Returns current Wedding.

### Response

```json
{
  "data": {
    "id": "weddingId",
    "brideName": "Princi",
    "groomName": "Akshay",
    "title": "Akshay & Princi",
    "description": "...",
    "weddingDate": "2027-02-14",
    "timeZone": "Asia/Kolkata",
    "location": {},
    "website": {},
    "gallery": {
      "isEnabled": true,
      "guestUploadsEnabled": true
    },
    "livestream": {
      "youtubeUrl": null,
      "isEnabled": false
    }
  }
}
```

Do not return secret token hashes.

---

# 19. Update Wedding

## PATCH `/api/wedding`

Authentication required.

Admin and Manager allowed.

### Request

Any subset:

```json
{
  "brideName": "Princi",
  "groomName": "Akshay",
  "description": "Updated welcome message",
  "weddingDate": "2027-02-14",
  "location": {
    "...": "..."
  }
}
```

Existing wedding slug should remain unchanged when names/date change.

---

# 20. Wedding Dashboard

## GET `/api/dashboard`

Authentication required.

Returns aggregated dashboard information.

### Response

```json
{
  "data": {
    "countdown": {
      "weddingDate": "2027-02-14",
      "daysRemaining": 42
    },
    "summary": {
      "events": 6,
      "tasks": {
        "total": 48,
        "completed": 32
      },
      "guests": 186,
      "rsvps": {
        "pending": 54,
        "attending": 120,
        "notAttending": 12
      },
      "totalExpensePaise": 124500000,
      "vendors": 8
    },
    "upcomingEvents": [],
    "upcomingTasks": []
  }
}
```

The dashboard endpoint is intentionally an aggregation endpoint.

This is preferable to requiring the frontend to make 8 independent requests.

---

# 21. Wedding Members

## GET `/api/members`

Authentication required.

Admin and Manager can view members.

### Response

```json
{
  "data": [
    {
      "membershipId": "...",
      "user": {
        "id": "...",
        "name": "Akshay Saini",
        "email": "akshay@example.com"
      },
      "role": "ADMIN",
      "joinedAt": "..."
    }
  ]
}
```

---

# 22. Invite Wedding Member

## POST `/api/members/invitations`

**Admin only.**

### Request

```json
{
  "email": "rahul@example.com",
  "role": "MANAGER"
}
```

### Behaviour

```text
Check Admin
↓
Normalize Email
↓
Ensure not already member
↓
Ensure no pending duplicate invite
↓
Create secure invitation token
↓
Create invitation record
↓
Send email immediately through Resend
```

### Response

```json
{
  "data": {
    "id": "invitationId",
    "email": "rahul@example.com",
    "role": "MANAGER",
    "status": "PENDING",
    "expiresAt": "..."
  }
}
```

---

# 23. List Pending Member Invitations

## GET `/api/members/invitations`

Admin only.

Returns pending invitations for the current Wedding.

---

# 24. Revoke Member Invitation

## DELETE `/api/members/invitations/:invitationId`

Admin only.

Marks invitation:

```text
REVOKED
```

rather than necessarily deleting it.

---

# 25. Get Public Member Invitation

## GET `/api/public/member-invitations/:token`

No authentication required.

Returns enough information to render the invitation page.

### Response

```json
{
  "data": {
    "email": "rahul@example.com",
    "role": "MANAGER",
    "wedding": {
      "brideName": "Princi",
      "groomName": "Akshay",
      "weddingDate": "2027-02-14"
    },
    "requiresLogin": true
  }
}
```

Do not expose internal Wedding information unnecessarily.

---

# 26. Accept Wedding Member Invitation

## POST `/api/member-invitations/:token/accept`

Authentication required.

### Behaviour

```text
Validate invitation
↓
Validate current user's normalized email matches invitation email
↓
Ensure user has no membership
↓
Create membership
↓
Mark invitation ACCEPTED
```

### Response

```json
{
  "data": {
    "weddingId": "...",
    "role": "MANAGER"
  }
}
```

### Errors

```text
INVALID_TOKEN
TOKEN_EXPIRED
INVITATION_ALREADY_ACCEPTED
ALREADY_HAS_WEDDING
INVITATION_EMAIL_MISMATCH
```

---

# 27. Change Member Role

## PATCH `/api/members/:membershipId`

Admin only.

### Request

```json
{
  "role": "ADMIN"
}
```

or:

```json
{
  "role": "MANAGER"
}
```

Backend must ensure Wedding never ends with zero Admins.

---

# 28. Remove Wedding Member

## DELETE `/api/members/:membershipId`

Admin only.

### Possible Errors

```text
LAST_ADMIN
NOT_FOUND
FORBIDDEN
```

Successful removal immediately invalidates Wedding access for that User.

Existing auth session itself may remain valid, but `/api/auth/me` will then show no Wedding membership.

---

# 29. Events

## GET `/api/events`

Authentication required.

### Query Parameters

```text
includeArchived=false
```

Optional:

```text
from
to
```

### Response

```json
{
  "data": [
    {
      "id": "...",
      "name": "Mehendi",
      "type": "MEHENDI",
      "startsAt": "...",
      "endsAt": "...",
      "venueName": "Royal Garden",
      "address": "...",
      "dressCode": "Green / Traditional"
    }
  ]
}
```

Default ordering:

```text
startsAt ASC
```

---

# 30. Create Event

## POST `/api/events`

Authentication required.

### Request

```json
{
  "name": "Mehendi",
  "type": "MEHENDI",
  "startsAt": "2027-02-12T10:30:00.000Z",
  "endsAt": "2027-02-12T14:30:00.000Z",
  "venueName": "Royal Garden",
  "address": "Dehradun",
  "description": "...",
  "dressCode": "Green / Traditional"
}
```

### Response

```text
201 Created
```

with created Event.

---

# 31. Get Event

## GET `/api/events/:eventId`

Authentication required.

Backend queries using:

```text
_id + currentWeddingId
```

---

# 32. Update Event

## PATCH `/api/events/:eventId`

Authentication required.

Allows partial updates.

---

# 33. Archive Event

## DELETE `/api/events/:eventId`

Authentication required.

This does not physically delete the Event.

Instead:

```text
archivedAt = now
```

### Response

```json
{
  "success": true
}
```

---

# 34. Tasks

## GET `/api/tasks`

Authentication required.

### Supported Query Parameters

```text
page
limit

status
priority
eventId
assignedMembershipId
mine=true
```

Example:

```text
GET /api/tasks?status=TODO&mine=true&page=1&limit=50
```

---

# 35. Create Task

## POST `/api/tasks`

### Request

```json
{
  "title": "Finalize photographer",
  "description": "Confirm final package",
  "assignedMembershipId": "...",
  "eventId": "...",
  "dueDate": "2026-09-15T00:00:00.000Z",
  "priority": "HIGH",
  "status": "TODO"
}
```

Backend validates:

```text
assignedMembership belongs to current Wedding
event belongs to current Wedding
```

---

# 36. Get Task

## GET `/api/tasks/:taskId`

Authentication required.

---

# 37. Update Task

## PATCH `/api/tasks/:taskId`

Example:

```json
{
  "status": "COMPLETED"
}
```

If status becomes `COMPLETED`:

```text
completedAt = now
```

If moved away from `COMPLETED`:

```text
completedAt = null
```

---

# 38. Delete Task

## DELETE `/api/tasks/:taskId`

Authentication required.

Hard deletion.

---

# 39. Guests

## GET `/api/guests`

Authentication required.

Paginated.

### Query Parameters

```text
page
limit

search
rsvpStatus
eventId
invitationSent
```

Example:

```text
/api/guests?search=sharma&rsvpStatus=PENDING&page=1&limit=50
```

### Search

Initial search can match:

```text
name
email
phone
```

Do not introduce Elasticsearch.

---

# 40. Create Guest

## POST `/api/guests`

### Request

```json
{
  "name": "Rajesh Sharma",
  "email": "rajesh@example.com",
  "phone": "+919876543210",
  "maxGuests": 4,
  "invitedEventIds": [
    "event1",
    "event2"
  ],
  "notes": "Family friend"
}
```

### Behaviour

Backend:

```text
validates event IDs
↓
generates invitation token
↓
stores token hash
↓
creates Guest
```

### Response

Should not normally return raw invitation token except when specifically needed for a sharing action.

---

# 41. Get Guest

## GET `/api/guests/:guestId`

Authentication required.

### Response

May include invitation-related information such as:

```json
{
  "data": {
    "id": "...",
    "name": "Rajesh Sharma",
    "email": "rajesh@example.com",
    "phone": "...",
    "maxGuests": 4,
    "invitedEvents": [],
    "rsvpStatus": "ATTENDING",
    "attendingCount": 3,
    "invitationSentAt": "...",
    "lastReminderSentAt": "..."
  }
}
```

---

# 42. Update Guest

## PATCH `/api/guests/:guestId`

Allows updates to:

```text
name
email
phone
maxGuests
invitedEventIds
notes
```

If `maxGuests` is reduced below an existing `attendingCount`, reject the request or require explicit correction.

Do not silently create inconsistent RSVP state.

---

# 43. Delete Guest

## DELETE `/api/guests/:guestId`

Authentication required.

Hard deletes Guest.

Also cancel pending EmailJobs related to that Guest.

Invitation link immediately becomes invalid.

---

# 44. Guest Invitation Sharing URL

The raw token should not be stored permanently, so we need a practical way for organisers to retrieve/share a guest URL.

One recommended pattern:

### POST `/api/guests/:guestId/invitation-link`

Authentication required.

This action **rotates or creates a new invitation token only if necessary**.

For V1, to preserve stable invitation links, I recommend storing the invitation token encrypted or storing a stable public invitation identifier separately rather than making the raw token impossible to retrieve.

However, since our database decision was to hash secret tokens, a cleaner architecture is:

> Generate the invitation link once and use email/share actions without requiring the frontend to retrieve the raw token later.

For manual WhatsApp sharing, we still need a reusable link.

Therefore V1 should use one of these two designs:

### Recommended V1 adjustment

Store:

```text
invitationTokenHash
```

and an additional random non-secret:

```text
invitationPublicId
```

But `publicId` alone would become the credential, making hashing irrelevant.

Therefore the simpler practical decision is:

> Store the guest invitation token encrypted at rest or accept storing the raw random token for this particular shareable stable-link use case.

For V1 simplicity, we will use:

```text
invitationToken
```

as a random, high-entropy value stored in the Guest document.

This is one deliberate exception to the general token-hashing preference because organisers repeatedly need to retrieve and share the same URL.

Session and password-reset tokens remain hashed.

Gallery token follows the same practical stable-sharing requirement and may also be stored as a high-entropy raw token.

This should be documented as an accepted tradeoff.

---

# 45. Get Guest Invitation Link

## GET `/api/guests/:guestId/invitation-link`

Authentication required.

### Response

```json
{
  "data": {
    "url": "https://makemymarriage.com/invite/abc123..."
  }
}
```

Used for:

- Copy Link
- WhatsApp Share

---

# 46. Send One Guest Invitation

## POST `/api/guests/:guestId/send-invitation`

Authentication required.

Guest must have email.

### Behaviour

```text
Load Guest
↓
Build Stable Invitation URL
↓
Send through Resend immediately
↓
Update invitationSentAt
```

### Response

```json
{
  "success": true
}
```

---

# 47. Send Bulk Guest Invitations

## POST `/api/guests/actions/send-invitations`

Authentication required.

### Request

Option A:

```json
{
  "guestIds": [
    "...",
    "..."
  ]
}
```

Option B:

```json
{
  "filter": {
    "invitationSent": false
  }
}
```

For MVP I recommend supporting **explicit guest IDs plus a simple preset action** rather than building arbitrary query serialization.

Example:

```json
{
  "scope": "ALL_UNSENT"
}
```

Possible scopes:

```text
ALL_UNSENT
ALL_PENDING_RSVP
SELECTED
```

If:

```text
SELECTED
```

then:

```json
{
  "scope": "SELECTED",
  "guestIds": ["...", "..."]
}
```

### Behaviour

Create EmailJobs.

### Response

```json
{
  "data": {
    "batchId": "batch-id",
    "jobsCreated": 437
  }
}
```

---

# 48. Send RSVP Reminder to One Guest

## POST `/api/guests/:guestId/send-reminder`

Authentication required.

Guest must:

```text
have email
AND
rsvpStatus = PENDING
```

Send immediately through Resend.

Update:

```text
lastReminderSentAt
reminderCount
```

---

# 49. Bulk RSVP Reminders

## POST `/api/guests/actions/send-reminders`

Authentication required.

Typical request:

```json
{
  "scope": "ALL_PENDING_RSVP"
}
```

Creates asynchronous EmailJobs.

---

# 50. Public Guest Invitation

## GET `/api/public/invitations/:token`

No login.

### Behaviour

```text
Validate token
↓
Resolve Guest
↓
Resolve Wedding
↓
Load only invited Events
↓
Return invitation data
```

### Response

```json
{
  "data": {
    "guest": {
      "name": "Rajesh Sharma",
      "maxGuests": 4,
      "rsvpStatus": "PENDING",
      "attendingCount": null
    },
    "wedding": {
      "brideName": "Princi",
      "groomName": "Akshay",
      "weddingDate": "2027-02-14",
      "coverImageUrl": "..."
    },
    "events": [
      {
        "name": "Wedding",
        "startsAt": "...",
        "venueName": "...",
        "address": "...",
        "dressCode": "..."
      }
    ]
  }
}
```

Do not expose:

```text
other guests
expenses
vendors
members
internal notes
```

---

# 51. Submit RSVP

## POST `/api/public/invitations/:token/rsvp`

No authentication.

Rate limited.

### Request — Attending

```json
{
  "status": "ATTENDING",
  "attendingCount": 3
}
```

### Request — Not Attending

```json
{
  "status": "NOT_ATTENDING",
  "attendingCount": 0
}
```

### Validation

```text
ATTENDING:
1 <= attendingCount <= maxGuests

NOT_ATTENDING:
attendingCount = 0
```

### Response

```json
{
  "data": {
    "status": "ATTENDING",
    "attendingCount": 3,
    "updatedAt": "..."
  }
}
```

The same endpoint may be used later to modify RSVP.

---

# 52. RSVP Summary

## GET `/api/guests/rsvp-summary`

Authentication required.

### Response

```json
{
  "data": {
    "totalGuests": 186,
    "pendingInvitations": 54,
    "attendingInvitations": 120,
    "notAttendingInvitations": 12,
    "totalPeopleAttending": 287
  }
}
```

This separates:

```text
Number of invitations
```

from:

```text
Number of actual attendees
```

which is important because each Guest may bring multiple people.

---

# 53. Expenses

## GET `/api/expenses`

Authentication required.

Paginated.

### Query Parameters

```text
page
limit

category
eventId
vendorId
from
to
```

Default ordering:

```text
expenseDate DESC
```

---

# 54. Create Expense

## POST `/api/expenses`

### Request

```json
{
  "title": "Photographer advance",
  "amountPaise": 5000000,
  "currency": "INR",
  "expenseDate": "2026-09-01",
  "category": "PHOTOGRAPHY",
  "eventId": "...",
  "vendorId": "...",
  "notes": "Advance payment"
}
```

Backend automatically sets:

```text
createdByMembershipId
```

from current Membership.

---

# 55. Expense Summary

## GET `/api/expenses/summary`

Authentication required.

### Response

```json
{
  "data": {
    "totalExpensePaise": 174250000,
    "currency": "INR",
    "byCategory": [
      {
        "category": "VENUE",
        "amountPaise": 60000000
      },
      {
        "category": "CATERING",
        "amountPaise": 42000000
      }
    ]
  }
}
```

---

# 56. Get Expense

## GET `/api/expenses/:expenseId`

Authentication required.

---

# 57. Update Expense

## PATCH `/api/expenses/:expenseId`

Authentication required.

Cross-Wedding Event/Vendor references must be validated.

---

# 58. Delete Expense

## DELETE `/api/expenses/:expenseId`

Authentication required.

Hard deletion.

---

# 59. My Vendors

## GET `/api/vendors`

Authentication required.

### Query Parameters

```text
page
limit
category
search
includeArchived
```

---

# 60. Create Vendor

## POST `/api/vendors`

### Request

```json
{
  "name": "Pixel Photography",
  "category": "PHOTOGRAPHER",
  "contactPerson": "Rohit",
  "phone": "+91...",
  "email": "...",
  "address": "...",
  "website": "...",
  "totalAgreedCostPaise": 20000000,
  "eventIds": ["..."],
  "notes": "Drone included"
}
```

Set:

```text
source = MANUAL
```

---

# 61. Add Discovered Vendor

## POST `/api/vendors/from-place`

Authentication required.

### Request

```json
{
  "googlePlaceId": "..."
}
```

Backend should fetch trusted Place information itself rather than blindly trusting client-provided vendor metadata.

### Behaviour

```text
Google Place ID
↓
Google Places Details
↓
Map supported fields
↓
Create Vendor
```

Set:

```text
source = GOOGLE_PLACES
```

---

# 62. Get Vendor

## GET `/api/vendors/:vendorId`

---

# 63. Update Vendor

## PATCH `/api/vendors/:vendorId`

---

# 64. Archive Vendor

## DELETE `/api/vendors/:vendorId`

Sets:

```text
archivedAt
```

rather than hard deleting.

---

# 65. Vendor Discovery

## GET `/api/vendor-discovery/search`

Authentication required.

### Query Parameters

```text
category
query
latitude
longitude
```

The backend may default coordinates from Wedding if not provided.

Example:

```text
/api/vendor-discovery/search?category=PHOTOGRAPHER
```

Backend:

```text
Current Wedding Location
↓
Google Places
↓
Results
```

Or custom:

```text
latitude=28.6139
longitude=77.2090
```

---

# 66. Vendor Discovery Response

```json
{
  "data": [
    {
      "googlePlaceId": "...",
      "name": "ABC Photography",
      "rating": 4.7,
      "ratingCount": 120,
      "address": "...",
      "latitude": 30.31,
      "longitude": 78.03
    }
  ]
}
```

Return only fields actually needed by our UI.

---

# 67. Wedding Website Settings

## GET `/api/wedding/website`

Authentication required.

### Response

```json
{
  "data": {
    "slug": "princi-akshay-14022027",
    "theme": "CLASSIC",
    "isPublished": false,
    "welcomeMessage": "..."
  }
}
```

---

# 68. Update Wedding Website

## PATCH `/api/wedding/website`

### Request

```json
{
  "theme": "MINIMAL",
  "welcomeMessage": "We would love to celebrate with you.",
  "isPublished": true
}
```

Do not permit arbitrary slug editing in V1.

Stable slug remains system-managed.

---

# 69. Public Wedding Website

## GET `/api/public/weddings/:slug`

No authentication.

Returns only public website information.

### Response

```json
{
  "data": {
    "brideName": "Princi",
    "groomName": "Akshay",
    "title": "Akshay & Princi",
    "description": "...",
    "weddingDate": "2027-02-14",
    "coverImageUrl": "...",
    "theme": "CLASSIC",
    "events": [],
    "gallery": {
      "enabled": true
    },
    "livestream": {
      "enabled": false,
      "youtubeUrl": null
    }
  }
}
```

If `isPublished = false`:

```text
404
```

is preferable to revealing unpublished wedding existence.

---

# 70. Livestream Settings

## GET `/api/wedding/livestream`

Authentication required.

---

# 71. Update Livestream

## PATCH `/api/wedding/livestream`

### Request

```json
{
  "youtubeUrl": "https://youtube.com/...",
  "isEnabled": true
}
```

Backend should validate supported YouTube URL formats.

---

# 72. Remove Livestream

Could use:

```text
PATCH /api/wedding/livestream
```

with:

```json
{
  "youtubeUrl": null,
  "isEnabled": false
}
```

No separate DELETE endpoint is necessary.

---

# 73. Gallery Settings

## GET `/api/gallery/settings`

Authentication required.

### Response

```json
{
  "data": {
    "isEnabled": true,
    "guestUploadsEnabled": true,
    "galleryUrl": "https://makemymarriage.com/gallery/...",
    "qrUrl": "https://makemymarriage.com/gallery/..."
  }
}
```

The frontend can generate/display QR using `galleryUrl`.

---

# 74. Update Gallery Settings

## PATCH `/api/gallery/settings`

### Request

```json
{
  "isEnabled": true,
  "guestUploadsEnabled": true
}
```

---

# 75. Photo List for Wedding Members

## GET `/api/photos`

Authentication required.

Use cursor pagination.

### Query Parameters

```text
eventId
cursor
limit
```

Example:

```text
/api/photos?eventId=abc&limit=50
```

### Response

```json
{
  "data": [
    {
      "id": "...",
      "eventId": "...",
      "url": "...",
      "originalFilename": "...",
      "uploaderType": "GUEST",
      "createdAt": "..."
    }
  ],
  "pagination": {
    "nextCursor": "..."
  }
}
```

URLs may be:

- signed read URLs
- controlled CDN URLs

depending on final R2 delivery configuration.

---

# 76. Authenticated Photo Upload Request

## POST `/api/photos/upload-url`

Authentication required.

### Request

```json
{
  "filename": "IMG_1001.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 5283912,
  "eventId": "..."
}
```

### Backend Validates

```text
Allowed MIME
Maximum size
Event belongs to Wedding
```

Then generates:

```text
R2 objectKey
Signed upload URL
```

### Response

```json
{
  "data": {
    "uploadUrl": "...",
    "objectKey": "weddings/.../gallery/...",
    "expiresAt": "..."
  }
}
```

---

# 77. Confirm Authenticated Photo Upload

## POST `/api/photos`

Authentication required.

Called after successful direct R2 upload.

### Request

```json
{
  "objectKey": "weddings/.../gallery/...",
  "filename": "IMG_1001.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 5283912,
  "eventId": "..."
}
```

Backend verifies object key belongs to the current Wedding upload namespace.

Then creates Photo metadata.

---

# 78. Delete Photo

## DELETE `/api/photos/:photoId`

Authentication required.

### Behaviour

```text
Verify Wedding ownership
↓
Delete R2 object
↓
Delete Photo metadata
```

---

# 79. Public Gallery

## GET `/api/public/galleries/:token/photos`

No login.

Token-protected.

Rate limiting may be applied.

Uses cursor pagination.

### Query Parameters

```text
eventId
cursor
limit
```

Returns gallery-safe Photo objects.

---

# 80. Public Gallery Information

## GET `/api/public/galleries/:token`

Returns:

```json
{
  "data": {
    "wedding": {
      "brideName": "Princi",
      "groomName": "Akshay",
      "weddingDate": "2027-02-14"
    },
    "guestUploadsEnabled": true,
    "events": [
      {
        "id": "...",
        "name": "Mehendi"
      }
    ]
  }
}
```

---

# 81. Guest Photo Upload URL

## POST `/api/public/galleries/:token/upload-url`

No login.

Rate limited.

### Request

```json
{
  "filename": "photo.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 4200000,
  "eventId": "..."
}
```

Backend:

```text
Validate gallery token
↓
Ensure gallery enabled
↓
Ensure guest uploads enabled
↓
Validate event belongs to Wedding
↓
Validate file metadata
↓
Generate short-lived signed R2 URL
```

---

# 82. Confirm Guest Upload

## POST `/api/public/galleries/:token/photos`

No login.

### Request

```json
{
  "objectKey": "...",
  "filename": "photo.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 4200000,
  "eventId": "..."
}
```

Creates:

```text
uploaderType = GUEST
```

No moderation stage.

---

# 83. Cover Image Uploads

Wedding and Event cover images should use the same direct-upload architecture.

Potential endpoints:

```text
POST /api/wedding/cover/upload-url

POST /api/events/:eventId/cover/upload-url
```

After upload, a PATCH operation can save the resulting `objectKey`.

Example:

```json
{
  "coverImageObjectKey": "..."
}
```

We do not need an independent Media Service API for V1.

---

# 84. QR Code

No database QR entity is required.

## GET `/api/gallery/qr`

Authentication required.

Two acceptable approaches:

### Option A

Return gallery URL and let frontend generate the QR.

Preferred.

```json
{
  "data": {
    "galleryUrl": "https://makemymarriage.com/gallery/..."
  }
}
```

### Option B

Return generated SVG/PNG.

For V1 I prefer **Option A**.

It keeps backend simpler.

---

# 85. Bulk Email Batch Status

Because background emails run asynchronously, frontend needs a way to show status.

## GET `/api/email-batches/:batchId`

Authentication required.

Batch must belong to current Wedding.

### Response

```json
{
  "data": {
    "batchId": "...",
    "total": 437,
    "pending": 200,
    "processing": 30,
    "sent": 200,
    "failed": 7,
    "cancelled": 0,
    "completed": false
  }
}
```

No separate `email_batches` collection is required.

Aggregation can use `EmailJob.batchId`.

---

# 86. Retry Failed Email Batch Jobs

Optional but useful:

## POST `/api/email-batches/:batchId/retry-failed`

Authentication required.

Creates retry eligibility for jobs in:

```text
FAILED
```

subject to retry policy.

This may be deferred if the initial UI does not expose retry controls.

---

# 87. Internal Email Worker

## POST `/api/internal/jobs/email`

Not accessible to normal users.

Called by Vercel Cron.

Authentication uses internal Cron secret.

### Flow

```text
Validate Internal Secret
↓
Recover stale PROCESSING jobs
↓
Claim pending jobs atomically
↓
Process small batch
↓
Send via Resend
↓
Mark SENT / Retry / FAILED
```

### Response

```json
{
  "data": {
    "claimed": 50,
    "sent": 47,
    "failed": 3
  }
}
```

Do not expose this route publicly without authentication.

---

# 88. API Pagination

Two pagination strategies will be used.

---

# 89. Page-Based Pagination

Use for manageable admin datasets such as:

```text
Guests
Tasks
Expenses
Vendors
```

Parameters:

```text
page=1
limit=50
```

Limits should have an upper bound.

Example:

```text
maximum limit = 100
```

---

# 90. Cursor Pagination

Use for Photo Gallery because the number of photos can grow significantly and infinite scrolling is likely.

Example:

```text
GET /api/photos?cursor=abc&limit=50
```

Response:

```json
{
  "data": [],
  "pagination": {
    "nextCursor": "xyz"
  }
}
```

Cursor should represent ordering around:

```text
createdAt
_id
```

and remain opaque to clients.

---

# 91. Filtering Conventions

Use query parameters for collection filtering.

Examples:

```text
/api/tasks?status=TODO

/api/tasks?eventId=123

/api/guests?rsvpStatus=ATTENDING

/api/expenses?category=CATERING

/api/vendors?category=PHOTOGRAPHER
```

Do not create endpoints like:

```text
/api/tasks/completed
/api/tasks/pending
/api/tasks/high-priority
```

when filters solve the same problem cleanly.

---

# 92. Sorting

Initial APIs should expose sorting only when needed by actual UI.

We do not need a completely generic:

```text
sortBy
sortDirection
```

system everywhere.

Default sorting should be domain-specific.

Examples:

```text
Events
startsAt ASC

Tasks
dueDate ASC

Guests
createdAt DESC or name ASC

Expenses
expenseDate DESC

Photos
createdAt DESC
```

---

# 93. Search

Basic search is sufficient for V1.

Examples:

### Guests

```text
name
email
phone
```

### Vendors

```text
name
contact person
```

No separate search infrastructure is required.

---

# 94. Request Validation

Every external body/query parameter should pass through Zod.

Example:

```text
POST /api/guests
```

should validate:

```text
name required

valid optional email

maxGuests >= 1

eventIds valid ObjectId strings

phone string length constraints
```

Validation errors should return structured field details.

---

# 95. ObjectId Validation

Never pass malformed Mongo IDs directly to Mongoose queries.

Validate route parameters such as:

```text
eventId
guestId
vendorId
expenseId
membershipId
```

before querying.

Malformed IDs should generally return:

```text
400 VALIDATION_ERROR
```

rather than becoming a database error.

---

# 96. Resource Isolation

For every Wedding-owned authenticated resource:

```text
GET /api/vendors/:vendorId
```

database lookup must include:

```text
vendorId
+
currentWeddingId
```

If the vendor belongs to another Wedding, return:

```text
404 NOT_FOUND
```

rather than:

```text
403
```

This avoids leaking resource existence across tenants.

---

# 97. Admin Authorization

Only these operations require ADMIN:

```text
Invite Wedding Member

Revoke Member Invite

Change Member Role

Remove Member
```

Everything else can be managed by ADMIN and MANAGER.

This should be represented by reusable authorization middleware/helper logic.

---

# 98. Public API Data Minimization

Public APIs should return only what the page requires.

For example:

```text
/api/public/invitations/:token
```

should not expose:

```text
Wedding Members
Guest email unless necessary
Guest notes
Expense data
Vendor contracts
Internal IDs unnecessarily
```

---

# 99. Rate Limiting Targets

At minimum rate limit:

```text
POST /api/auth/login

POST /api/auth/signup

POST /api/auth/forgot-password

POST /api/auth/reset-password

GET /api/public/invitations/:token

POST /api/public/invitations/:token/rsvp

POST /api/public/galleries/:token/upload-url

POST /api/public/galleries/:token/photos
```

Photo upload flows should additionally enforce upload-count and size limits.

---

# 100. CSRF Considerations

Because authenticated APIs use cookies, state-changing authenticated operations require CSRF consideration.

At minimum:

- Use SameSite cookies appropriately
- Validate request Origin/Host for mutation requests
- Do not allow wildcard CORS
- Keep APIs same-origin with the Next.js application

A separate CSRF token mechanism may be added if needed after implementation review.

---

# 101. CORS

For V1:

> Keep the API same-origin.

Do not enable unrestricted cross-origin API access.

This removes unnecessary attack surface.

Future mobile/native applications can introduce explicit CORS/API-authentication changes later.

---

# 102. Idempotency

Not every endpoint needs idempotency keys.

Important areas:

### Bulk Email

Use EmailJob-level idempotency.

### RSVP

Calling RSVP twice with the same state should simply result in the same final state.

### Photo Metadata

The same R2 object should not create duplicate Photo records.

`objectKey UNIQUE` provides protection.

### Wedding Creation

A user already having a Wedding receives a conflict rather than creating another.

---

# 103. External Provider Errors

Do not leak provider-specific errors directly.

Example Google response:

```text
REQUEST_DENIED
```

should be transformed into:

```json
{
  "error": {
    "code": "EXTERNAL_SERVICE_ERROR",
    "message": "Vendor discovery is temporarily unavailable."
  }
}
```

Detailed provider errors can be logged internally.

---

# 104. API Logging

Important API logs may include:

```text
requestId
method
route
status
userId
weddingId
duration
errorCode
```

Never log:

```text
password
session token
reset token
member invitation token
guest invitation token
gallery token
R2 signed URL
```

---

# 105. Suggested Route Tree

Conceptually:

```text
/api

├── auth
│   ├── signup
│   ├── login
│   ├── logout
│   ├── me
│   ├── forgot-password
│   └── reset-password
│
├── dashboard
│
├── wedding
│   ├── route
│   ├── website
│   ├── livestream
│   └── cover
│
├── members
│   ├── route
│   ├── [membershipId]
│   └── invitations
│
├── member-invitations
│   └── [token]
│       └── accept
│
├── events
│   ├── route
│   └── [eventId]
│
├── tasks
│   ├── route
│   └── [taskId]
│
├── guests
│   ├── route
│   ├── rsvp-summary
│   ├── actions
│   │   ├── send-invitations
│   │   └── send-reminders
│   └── [guestId]
│       ├── route
│       ├── invitation-link
│       ├── send-invitation
│       └── send-reminder
│
├── expenses
│   ├── route
│   ├── summary
│   └── [expenseId]
│
├── vendors
│   ├── route
│   ├── from-place
│   └── [vendorId]
│
├── vendor-discovery
│   └── search
│
├── gallery
│   ├── settings
│   └── qr
│
├── photos
│   ├── route
│   ├── upload-url
│   └── [photoId]
│
├── email-batches
│   └── [batchId]
│
├── public
│   ├── member-invitations
│   │   └── [token]
│   ├── invitations
│   │   └── [token]
│   │       └── rsvp
│   ├── weddings
│   │   └── [slug]
│   └── galleries
│       └── [token]
│           ├── photos
│           └── upload-url
│
└── internal
    └── jobs
        └── email
```

Exact Next.js folder layout will be defined during application/module design.

---

# 106. Endpoint Inventory

## Authentication

```text
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

## Wedding

```text
POST   /api/wedding
GET    /api/wedding
PATCH  /api/wedding

GET    /api/dashboard
```

## Members

```text
GET    /api/members

PATCH  /api/members/:membershipId
DELETE /api/members/:membershipId

POST   /api/members/invitations
GET    /api/members/invitations
DELETE /api/members/invitations/:invitationId

GET    /api/public/member-invitations/:token
POST   /api/member-invitations/:token/accept
```

## Events

```text
GET    /api/events
POST   /api/events

GET    /api/events/:eventId
PATCH  /api/events/:eventId
DELETE /api/events/:eventId
```

## Tasks

```text
GET    /api/tasks
POST   /api/tasks

GET    /api/tasks/:taskId
PATCH  /api/tasks/:taskId
DELETE /api/tasks/:taskId
```

## Guests

```text
GET    /api/guests
POST   /api/guests

GET    /api/guests/:guestId
PATCH  /api/guests/:guestId
DELETE /api/guests/:guestId

GET    /api/guests/rsvp-summary

GET    /api/guests/:guestId/invitation-link

POST   /api/guests/:guestId/send-invitation
POST   /api/guests/:guestId/send-reminder

POST   /api/guests/actions/send-invitations
POST   /api/guests/actions/send-reminders
```

## Public Guest Invitation

```text
GET    /api/public/invitations/:token
POST   /api/public/invitations/:token/rsvp
```

## Expenses

```text
GET    /api/expenses
POST   /api/expenses

GET    /api/expenses/summary

GET    /api/expenses/:expenseId
PATCH  /api/expenses/:expenseId
DELETE /api/expenses/:expenseId
```

## Vendors

```text
GET    /api/vendors
POST   /api/vendors

POST   /api/vendors/from-place

GET    /api/vendors/:vendorId
PATCH  /api/vendors/:vendorId
DELETE /api/vendors/:vendorId
```

## Vendor Discovery

```text
GET    /api/vendor-discovery/search
```

## Wedding Website

```text
GET    /api/wedding/website
PATCH  /api/wedding/website

GET    /api/public/weddings/:slug
```

## Livestream

```text
GET    /api/wedding/livestream
PATCH  /api/wedding/livestream
```

## Gallery

```text
GET    /api/gallery/settings
PATCH  /api/gallery/settings

GET    /api/gallery/qr
```

## Photos

```text
GET    /api/photos
POST   /api/photos

POST   /api/photos/upload-url

DELETE /api/photos/:photoId
```

## Public Gallery

```text
GET    /api/public/galleries/:token

GET    /api/public/galleries/:token/photos

POST   /api/public/galleries/:token/upload-url

POST   /api/public/galleries/:token/photos
```

## Email Jobs

```text
GET    /api/email-batches/:batchId

POST   /api/email-batches/:batchId/retry-failed
```

## Internal

```text
POST   /api/internal/jobs/email
```

---

# 107. Authentication Matrix

| API Area | Guest | Manager | Admin |
|---|---:|---:|---:|
| Auth | Selected endpoints | Yes | Yes |
| Wedding Dashboard | No | Yes | Yes |
| Wedding Details | No | Yes | Yes |
| Events | No | Full | Full |
| Tasks | No | Full | Full |
| Guests | No | Full | Full |
| Invitations | Token only | Full | Full |
| Expenses | No | Full | Full |
| Vendors | No | Full | Full |
| Vendor Discovery | No | Yes | Yes |
| Website Settings | No | Full | Full |
| Gallery Settings | No | Full | Full |
| Photos | Token gallery access | Full | Full |
| Livestream | Public viewing when published | Full | Full |
| Wedding Members | No | Read | Full management |

---

# 108. Important API Tradeoff: Stable Guest Tokens

The earlier database design preferred hashing every secret token.

For sessions and password reset tokens, this remains the correct choice.

However, guest invitation links and gallery links need to be:

- Stable
- Reusable
- Repeatedly shareable by Wedding Members
- Printable in the case of gallery QR

If only a one-way hash is stored, the raw URL cannot later be reconstructed.

Therefore the API/database implementation should make an explicit exception.

Recommended practical V1 decision:

```text
Session Token
→ hash only

Password Reset Token
→ hash only

Wedding Member Invitation Token
→ hash only

Guest Invitation Token
→ high-entropy stable raw token

Gallery Token
→ high-entropy stable raw token
```

Guest/gallery tokens are effectively **unguessable public-share secrets**, similar to many "anyone with the link" products.

They must:

- Have high entropy
- Never be sequential
- Never appear in logs
- Never be exposed in unrelated API responses
- Be rotatable in the future if compromised

This gives us a much cleaner user experience for Copy Link, WhatsApp and QR sharing.

---

# 109. What the API Will NOT Include in V1

No APIs for:

```text
Multiple Weddings Per User

Budget Planning

Payment Installments

Hotels

Travel

Transport

Seating Plans

SMS

WhatsApp API Automation

Realtime Notifications

WebSockets

Activity Logs

Advanced Photo Moderation

Vendor Marketplace Checkout

Vendor Payments

Custom Domains

AI Assistant

Product Analytics
```

---

# 110. API Design Principles to Freeze

## Decision 1

**Use REST through Next.js Route Handlers.**

---

## Decision 2

**Private APIs derive Wedding context from the authenticated session.**

Client does not control tenant identity.

---

## Decision 3

**ADMIN and MANAGER share almost all functionality.**

Only Member-management mutations require ADMIN.

---

## Decision 4

**Public Guest APIs use high-entropy token URLs instead of login.**

---

## Decision 5

**Use page-based pagination for admin lists and cursor pagination for photos.**

---

## Decision 6

**Use Zod at every external API boundary.**

---

## Decision 7

**Use consistent application error objects.**

---

## Decision 8

**Use action endpoints only where the operation is genuinely not simple CRUD.**

Examples:

```text
send-invitation
send-reminder
accept
rsvp
```

---

## Decision 9

**Bulk emails return immediately after creating EmailJobs.**

Processing happens asynchronously.

---

## Decision 10

**Photo binaries never flow through normal API endpoints.**

API issues short-lived R2 upload URLs; browser uploads directly.

---

## Decision 11

**External APIs are hidden behind our backend.**

Frontend does not call Google Places directly.

---

## Decision 12

**Cross-Wedding resource access should behave like NOT_FOUND.**

Do not expose existence of another Wedding's resources.

---

# 111. Typical End-to-End API Flow

A representative wedding journey:

```text
POST /api/auth/signup
        ↓
POST /api/wedding
        ↓
POST /api/events
        ↓
POST /api/members/invitations
        ↓
POST /api/tasks
        ↓
POST /api/guests
        ↓
POST /api/guests/actions/send-invitations
        ↓
Background Email Jobs
        ↓
GET /api/public/invitations/:token
        ↓
POST /api/public/invitations/:token/rsvp
        ↓
POST /api/expenses
        ↓
POST /api/vendors
        ↓
PATCH /api/wedding/website
        ↓
POST /api/public/galleries/:token/upload-url
        ↓
Direct Cloudflare R2 Upload
        ↓
POST /api/public/galleries/:token/photos
```

---

# 112. Next Design Step

With:

```text
PRD
    ↓
System Design
    ↓
Database Design
    ↓
API Design
```

now frozen, the next logical document should be:

# Application / Codebase Architecture

That document should define:

- Next.js folder structure
- Route groups
- Domain module structure
- API route-handler structure
- Services
- Repositories
- Mongoose models
- Zod schemas
- Authentication utilities
- Authorization helpers
- Error classes
- Email abstraction
- Storage abstraction
- Google Places abstraction
- Server/client boundaries
- Naming conventions
- Dependency rules between modules

After that, we can move into **frontend architecture/UI flows**, and then implementation can begin without Codex having to invent foundational architecture while writing code.