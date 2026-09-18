# Make My Marriage
## Database Design Document

**Version:** V1  
**Database:** MongoDB Atlas  
**ODM:** Mongoose  
**Validation:** Zod + Mongoose  
**Primary Tenant:** Wedding  
**Status:** Database Design Baseline

---

# 1. Purpose

This document defines the MongoDB data model for **Make My Marriage V1**.

It covers:

- Collections
- Relationships
- Embedded vs referenced data
- Important fields
- Indexes
- Uniqueness constraints
- Tenant isolation
- Authentication data
- Guest-token design
- Wedding-member invitations
- Email jobs
- Photo metadata
- Deletion strategy
- Transactions
- Data integrity rules

Detailed Mongoose implementation and exact API payloads will be designed separately.

---

# 2. Database Design Principles

## 2.1 Wedding is the Tenant

Almost every domain entity belongs to a Wedding.

Examples:

```text
Event        → weddingId
Task         → weddingId
Guest        → weddingId
Vendor       → weddingId
Expense      → weddingId
Photo        → weddingId
```

Every private query should include the current authenticated Wedding.

---

## 2.2 Do Not Create One Giant Wedding Document

Avoid:

```javascript
Wedding {
    guests: [1000 guests],
    photos: [5000 photos],
    tasks: [...],
    events: [...],
    expenses: [...],
    vendors: [...]
}
```

Large and continuously growing collections belong in separate MongoDB collections.

---

## 2.3 Embed Small Bounded Configuration

Information with a strict 1:1 relationship to a Wedding can be embedded.

Examples:

```text
Wedding
├── location
├── website settings
├── gallery settings
└── livestream settings
```

These objects are small and always loaded together with the Wedding.

---

## 2.4 Reference Growing Data

Use references for:

```text
Events
Tasks
Guests
Vendors
Expenses
Photos
Memberships
Email Jobs
```

---

## 2.5 Denormalize Only When Useful

For V1, avoid maintaining counters such as:

```text
wedding.totalGuests
wedding.completedTasks
wedding.totalExpenses
```

These can initially be calculated from indexed collections.

At much larger scale, selective counters can be introduced.

---

# 3. Collection Overview

The initial database contains the following major collections:

```text
users

sessions
password_reset_tokens

weddings
wedding_memberships
wedding_member_invitations

events
tasks

guests

vendors
expenses

photos

email_jobs
```

There is intentionally no separate collection for:

```text
Wedding Website
Gallery
Livestream
Guest Invitation
RSVP
```

because these have natural 1:1 relationships with an existing entity and can be represented without additional collections.

---

# 4. High-Level Relationship Diagram

```text
                               User
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
              Session                  WeddingMembership
                                               │
                                               ▼
                                            Wedding
                                               │
                 ┌───────────┬─────────────────┼─────────────────┐
                 │           │                 │                 │
                 ▼           ▼                 ▼                 ▼
               Event       Guest             Vendor           Expense
                 │           │                 │                 │
                 │           │                 └───────┐         │
                 │           │                         │         │
                 ▼           │                         ▼         │
               Task          │                      Expense ◄────┘
                             │
                             ▼
                      Invitation + RSVP
                       embedded in Guest


                                            Wedding
                                               │
                                               ▼
                                             Photo
                                               │
                                               ▼
                                        Cloudflare R2


                                            Wedding
                                               │
                                               ▼
                                           EmailJob
```

---

# 5. ID Strategy

MongoDB `ObjectId` will be used for internal entities.

Example:

```text
_id: ObjectId
```

We do not need:

- Auto-increment IDs
- Numeric IDs
- UUIDs for normal internal database entities

Publicly shared resources should use random tokens rather than ObjectIds.

Examples:

```text
Guest invitation → random secret token

Gallery access → random secret token

Password reset → random secret token

Session → random secret token
```

Wedding website uses a human-readable slug.

---

# 6. Common Fields

Most collections should contain:

```javascript
{
    _id: ObjectId,

    createdAt: Date,
    updatedAt: Date
}
```

Mongoose timestamps can manage these fields automatically.

Wedding-owned entities additionally contain:

```javascript
{
    weddingId: ObjectId
}
```

---

# 7. Users Collection

## Collection

```text
users
```

Represents authenticated Wedding Members.

Guests never appear in this collection.

---

## Suggested Schema

```javascript
User {
    _id: ObjectId,

    name: String,

    email: String,
    emailNormalized: String,

    passwordHash: String,

    createdAt: Date,
    updatedAt: Date
}
```

---

## Email Normalization

Always retain both:

```text
email
emailNormalized
```

Example:

```text
email:
"Akshay.Saini@gmail.com"

emailNormalized:
"akshay.saini@gmail.com"
```

At minimum normalization should:

```text
trim whitespace
convert to lowercase
```

Do not implement provider-specific transformations such as Gmail dot removal.

---

## Indexes

```javascript
unique(emailNormalized)
```

This ensures a single account per email.

---

# 8. Important Authentication Tradeoff

V1 intentionally does **not require email verification**.

Therefore:

```text
Signup
→ account immediately active
```

This simplifies onboarding but means the application does not independently prove that the registrant owns the email address.

This is an accepted V1 product decision.

Password-reset emails still require control of the email account.

---

# 9. Sessions Collection

## Collection

```text
sessions
```

Used for server-side authentication sessions.

---

## Suggested Schema

```javascript
Session {
    _id: ObjectId,

    userId: ObjectId,

    tokenHash: String,

    expiresAt: Date,

    createdAt: Date,

    lastUsedAt: Date?
}
```

The raw session token is stored only inside the browser cookie.

MongoDB should store its hash.

---

# 10. Session Token Strategy

Generate a cryptographically random token.

Conceptually:

```text
Random Session Token
       ↓
Browser Cookie
```

Database:

```text
SHA-256 / secure hash
       ↓
tokenHash
```

On every authenticated request:

```text
Cookie Token
    ↓
Hash
    ↓
Find Session by tokenHash
```

This prevents the database from storing directly reusable session credentials.

---

# 11. Session Indexes

```javascript
unique(tokenHash)

index(userId)

TTL(expiresAt)
```

MongoDB's TTL index can automatically remove expired sessions.

---

# 12. Password Reset Tokens

## Collection

```text
password_reset_tokens
```

---

## Suggested Schema

```javascript
PasswordResetToken {
    _id: ObjectId,

    userId: ObjectId,

    tokenHash: String,

    expiresAt: Date,

    usedAt: Date?,

    createdAt: Date
}
```

---

## Indexes

```javascript
unique(tokenHash)

index(userId)

TTL(expiresAt)
```

Reset tokens should:

- Be random
- Expire
- Be single-use

---

# 13. Weddings Collection

## Collection

```text
weddings
```

This is the central tenant collection.

---

## Suggested Schema

```javascript
Wedding {
    _id: ObjectId,

    brideName: String,
    groomName: String,

    title: String?,
    description: String?,

    weddingDate: String,

    timeZone: String,

    coverImageObjectKey: String?,

    location: {
        formattedAddress: String?,
        city: String?,
        state: String?,
        country: String?,

        latitude: Number?,
        longitude: Number?,

        googlePlaceId: String?
    },

    website: {
        slug: String,

        theme: String,

        isPublished: Boolean,

        welcomeMessage: String?
    },

    gallery: {
        tokenHash: String,

        isEnabled: Boolean,

        guestUploadsEnabled: Boolean
    },

    livestream: {
        youtubeUrl: String?,
        isEnabled: Boolean
    },

    createdByUserId: ObjectId,

    deletedAt: Date?,

    createdAt: Date,
    updatedAt: Date
}
```

---

# 14. Wedding Date

The primary wedding date should be stored as a **date-only value**:

```text
YYYY-MM-DD
```

Example:

```text
2027-02-14
```

rather than pretending it has a specific time.

This avoids timezone-related changes such as:

```text
14 February
becoming
13 February
```

during UTC conversion.

---

# 15. Wedding Timezone

Store:

```text
timeZone
```

Example:

```text
Asia/Kolkata
```

Event timestamps can then be rendered correctly.

Even though V1 primarily targets Indian weddings, explicit timezone storage prevents hidden assumptions throughout the application.

---

# 16. Wedding Location

Wedding location is embedded because it belongs directly to one Wedding.

Example:

```javascript
location: {
    formattedAddress: "Dehradun, Uttarakhand, India",
    city: "Dehradun",
    state: "Uttarakhand",
    country: "India",

    latitude: 30.3165,
    longitude: 78.0322,

    googlePlaceId: "..."
}
```

This supports:

- Display
- Maps
- Vendor discovery
- Nearby searches

---

# 17. Wedding Website Data

The wedding website does not require its own collection.

It has a strict 1:1 relationship with the Wedding.

Embed:

```javascript
website: {
    slug,
    theme,
    isPublished,
    welcomeMessage
}
```

---

# 18. Wedding Slug

Example:

```text
akshay-princi-14022027
```

Index:

```javascript
unique(website.slug)
```

If a collision occurs:

```text
akshay-princi-14022027-2
```

Once created, the slug remains stable.

Changing wedding names or wedding date should not automatically update it.

---

# 19. Wedding Gallery Configuration

There is one gallery per Wedding.

Therefore gallery configuration remains embedded:

```javascript
gallery: {
    tokenHash,
    isEnabled,
    guestUploadsEnabled
}
```

The raw gallery token exists in the shared gallery URL.

Example:

```text
/gallery/super-secret-random-token
```

Only the hash is persisted.

---

# 20. Gallery Token

The gallery token should:

- Be generated cryptographically
- Have high entropy
- Be unique
- Remain stable

Index:

```javascript
unique(gallery.tokenHash)
```

Changing this token would invalidate printed QR codes, so token rotation should only happen explicitly if ever introduced.

---

# 21. Livestream Data

Livestream is also a 1:1 Wedding property.

Embed:

```javascript
livestream: {
    youtubeUrl,
    isEnabled
}
```

No separate livestream collection is required.

---

# 22. Wedding Indexes

Recommended:

```javascript
unique(website.slug)

unique(gallery.tokenHash)

index(createdAt)
```

No geospatial MongoDB index is required initially because vendor discovery occurs through Google Places rather than internal geographic queries.

---

# 23. Wedding Memberships

## Collection

```text
wedding_memberships
```

Represents the relationship between authenticated Users and a Wedding.

---

## Suggested Schema

```javascript
WeddingMembership {
    _id: ObjectId,

    userId: ObjectId,

    weddingId: ObjectId,

    role: "ADMIN" | "MANAGER",

    joinedAt: Date,

    createdAt: Date,
    updatedAt: Date
}
```

---

# 24. Why Membership is Separate

We could store:

```text
user.weddingId
user.role
```

but a Membership collection better represents the domain.

It also allows future expansion to:

```text
one user → multiple weddings
```

without redesigning the entire database.

---

# 25. Membership Constraints

V1 allows:

```text
one User → one Wedding
```

Therefore create:

```javascript
unique(userId)
```

Also:

```javascript
unique(weddingId, userId)
```

The first constraint is the V1 rule.

The second protects logical consistency.

---

# 26. Membership Indexes

```javascript
unique(userId)

unique(weddingId, userId)

index(weddingId, role)
```

---

# 27. Membership Integrity

Application logic must enforce:

- Wedding always has at least one ADMIN
- Manager cannot modify memberships
- User cannot join two weddings
- Removed member immediately loses wedding access

---

# 28. Wedding Member Invitations

## Collection

```text
wedding_member_invitations
```

Used before the invited person becomes a Wedding Member.

---

## Suggested Schema

```javascript
WeddingMemberInvitation {
    _id: ObjectId,

    weddingId: ObjectId,

    email: String,
    emailNormalized: String,

    role: "ADMIN" | "MANAGER",

    tokenHash: String,

    status:
        "PENDING"
        | "ACCEPTED"
        | "REVOKED",

    invitedByUserId: ObjectId,

    acceptedByUserId: ObjectId?,

    expiresAt: Date,

    acceptedAt: Date?,

    createdAt: Date,
    updatedAt: Date
}
```

Expired state can be derived from:

```text
status = PENDING
AND
expiresAt < now
```

We do not necessarily need to permanently mutate the status to `EXPIRED`.

---

# 29. Member Invitation Indexes

```javascript
unique(tokenHash)

index(weddingId, status)

index(emailNormalized)

index(expiresAt)
```

Recommended partial uniqueness rule:

```text
Only one PENDING invitation
per wedding + email
```

Conceptually:

```javascript
unique(
    weddingId,
    emailNormalized
)
WHERE status = "PENDING"
```

---

# 30. Invitation Acceptance

When an invite is accepted:

```text
Validate Token
    ↓
Validate Expiry
    ↓
Validate Signed-in User Email
    ↓
Ensure User Has No Existing Membership
    ↓
Create WeddingMembership
    ↓
Mark Invitation ACCEPTED
```

The membership creation and invitation update should happen atomically.

---

# 31. Events Collection

## Collection

```text
events
```

---

## Suggested Schema

```javascript
Event {
    _id: ObjectId,

    weddingId: ObjectId,

    name: String,

    type: String?,

    startsAt: Date,
    endsAt: Date?,

    venueName: String?,

    address: String?,

    description: String?,

    dressCode: String?,

    coverImageObjectKey: String?,

    archivedAt: Date?,

    createdAt: Date,
    updatedAt: Date
}
```

---

# 32. Event Type

`name` remains free-form.

Optional `type` can represent presets such as:

```text
ROKA
ENGAGEMENT
MEHENDI
HALDI
SANGEET
COCKTAIL
WEDDING
RECEPTION
CUSTOM
```

For a custom event:

```text
type = CUSTOM
name = "Family Dinner"
```

---

# 33. Event Timestamps

Event date/time should be stored as UTC timestamps:

```text
startsAt
endsAt
```

and rendered using:

```text
Wedding.timeZone
```

---

# 34. Event Deletion

Events are referenced by:

- Tasks
- Guests
- Vendors
- Expenses
- Photos

Therefore hard deletion can create dangling relationships.

Recommended V1 approach:

```text
Archive Event
```

using:

```javascript
archivedAt
```

Archived events:

- Do not appear in normal planning views
- Do not appear in future invitations
- Preserve existing relationships

This is safer than cascading deletion across many collections.

---

# 35. Event Indexes

```javascript
index(weddingId, startsAt)

index(weddingId, archivedAt)
```

---

# 36. Tasks Collection

## Collection

```text
tasks
```

---

## Suggested Schema

```javascript
Task {
    _id: ObjectId,

    weddingId: ObjectId,

    title: String,
    description: String?,

    assignedMembershipId: ObjectId?,

    eventId: ObjectId?,

    dueDate: Date?,

    priority:
        "LOW"
        | "MEDIUM"
        | "HIGH",

    status:
        "TODO"
        | "IN_PROGRESS"
        | "COMPLETED",

    completedAt: Date?,

    createdAt: Date,
    updatedAt: Date
}
```

---

# 37. Why Assign to Membership Instead of User

Prefer:

```text
assignedMembershipId
```

over:

```text
assignedUserId
```

because assignment represents:

> this person acting as a member of this Wedding.

It also makes same-wedding validation explicit.

---

# 38. Task Integrity Rules

When assigning a task:

```text
Task.weddingId
must equal
Membership.weddingId
```

When linking an Event:

```text
Task.weddingId
must equal
Event.weddingId
```

MongoDB does not enforce foreign keys, so application services must enforce these rules.

---

# 39. Task Indexes

Recommended:

```javascript
index(weddingId, status)

index(weddingId, dueDate)

index(weddingId, assignedMembershipId, status)

index(weddingId, eventId)
```

---

# 40. Task Deletion

Tasks can be hard deleted.

They are leaf-level operational data and are not required as a dependency by other V1 modules.

---

# 41. Guests Collection

## Collection

```text
guests
```

One Guest record represents one invitation.

It does not represent every person in a family individually.

---

## Suggested Schema

```javascript
Guest {
    _id: ObjectId,

    weddingId: ObjectId,

    name: String,

    email: String?,
    emailNormalized: String?,

    phone: String?,

    maxGuests: Number,

    invitedEventIds: [ObjectId],

    notes: String?,

    invitationToken: String, // Stable share secret; excluded from ordinary reads.

    invitationSentAt: Date?,

    lastReminderSentAt: Date?,

    reminderCount: Number,

    rsvpStatus:
        "PENDING"
        | "ATTENDING"
        | "NOT_ATTENDING",

    attendingCount: Number?,

    rsvpUpdatedAt: Date?,

    createdAt: Date,
    updatedAt: Date
}
```

---

# 42. Why Invitation Data Lives on Guest

V1 has:

```text
one Guest
→ one stable invitation link
→ one RSVP
```

Therefore a separate `guest_invitations` collection adds unnecessary complexity.

The Guest document naturally owns:

```text
invitationToken
email-send status
RSVP
```

If the product later supports multiple invitation versions, channels or detailed delivery histories, this can be separated.

---

# 43. Guest Invitation Token

Generate token when the Guest is created.

This allows invitations to be:

- emailed
- copied
- manually shared through WhatsApp

without changing the URL later.

V1 follows the stable-sharing exception in `API_DESIGN.md` §44: store a
cryptographically random, 32-byte invitation token on the Guest, with a unique
index and excluded from default reads. CRUD projections must never expose it.
This supersedes the earlier guest token-hash recommendation; sessions and member
invitation tokens retain their existing HMAC hashing rules.

The initial Guest Management increment creates this secret but exposes no sharing
URL or public invitation endpoint. The subsequent sharing/RSVP increment
(2026-09-16) retrieves the existing secret via a wedding-scoped explicit projection.
Public token resolution projects only the owner fields needed for the invitation.
RSVP updates condition on guest ID, wedding ID, token, `__v`, and current capacity;
they increment `__v` and set status, attendance count, and `rsvpUpdatedAt` together.
The wedding-scoped summary aggregates guest groups by status and sums saved
attendance, independently of maximum party capacity. No new domain collection is
needed. Existing HMAC-keyed MongoDB rate counters also limit public RSVP writes.

---

# 44. Guest RSVP

Initial state:

```javascript
rsvpStatus: "PENDING"
attendingCount: null
```

If attending:

```javascript
rsvpStatus: "ATTENDING"
attendingCount: 3
```

If not:

```javascript
rsvpStatus: "NOT_ATTENDING"
attendingCount: 0
```

---

# 45. RSVP Constraints

For attending guests:

```text
1 <= attendingCount <= maxGuests
```

For not attending:

```text
attendingCount = 0
```

These should be enforced in the service layer and validation schema.

---

# 46. Event-Level Invitations

Because the number of wedding events is small and bounded, Guest can contain:

```javascript
invitedEventIds: [ObjectId]
```

This is a good use of MongoDB embedding.

We do not need a join collection such as:

```text
guest_event_invitations
```

for V1.

---

# 47. Guest Indexes

Recommended:

```javascript
unique(invitationToken)

index(weddingId, rsvpStatus)

index(weddingId, name)

index(weddingId, emailNormalized)

index(weddingId, invitedEventIds)
```

Guest email should **not** be globally unique.

Two invitations may legitimately use:

- same family email
- shared household email

---

# 48. Guest Deletion

Guests can be hard deleted.

Deleting a Guest should also:

- invalidate their invitation automatically
- cancel any pending email jobs associated with the Guest

Previously sent email links then simply become invalid.

---

# 49. Vendors Collection

## Collection

```text
vendors
```

---

## Suggested Schema

```javascript
Vendor {
    _id: ObjectId,

    weddingId: ObjectId,

    name: String,

    category: String,

    contactPerson: String?,

    phone: String?,
    email: String?,

    address: String?,
    website: String?,

    totalAgreedCostPaise: Number?,

    eventIds: [ObjectId],

    notes: String?,

    source:
        "MANUAL"
        | "GOOGLE_PLACES",

    googlePlaceId: String?,

    archivedAt: Date?,

    createdAt: Date,
    updatedAt: Date
}
```

---

# 50. Money Storage

Do not store monetary values as arbitrary floating-point rupee amounts.

Instead use:

```text
integer minor units
```

For INR:

```text
₹1,234.50
=
123450 paise
```

Field:

```javascript
totalAgreedCostPaise
```

This avoids floating-point arithmetic problems.

---

# 51. Vendor Event Relationship

Because each vendor can work at a small number of events:

```javascript
eventIds: [ObjectId]
```

is appropriate.

No vendor-event join collection is needed.

---

# 52. Google Places Vendors

When a user selects a Google Places result:

```text
Google Vendor
     ↓
Copy useful fields
     ↓
Create internal Vendor
```

Store:

```text
source = GOOGLE_PLACES
googlePlaceId = ...
```

The internal vendor record remains usable even if Google becomes unavailable later.

---

# 53. Vendor Indexes

Recommended:

```javascript
index(weddingId, category)

index(weddingId, archivedAt)

index(weddingId, googlePlaceId)
```

Optional partial uniqueness:

```text
One Google Place
per Wedding
```

can be enforced for non-null `googlePlaceId`.

---

# 54. Vendor Deletion

Vendors may be referenced by Expenses.

Therefore prefer:

```text
archive Vendor
```

rather than hard deletion.

Use:

```javascript
archivedAt
```

Existing expenses continue to point to the archived vendor.

---

# 55. Expenses Collection

## Collection

```text
expenses
```

---

## Suggested Schema

```javascript
Expense {
    _id: ObjectId,

    weddingId: ObjectId,

    title: String,

    amountPaise: Number,

    currency: "INR",

    expenseDate: Date,

    category: String,

    eventId: ObjectId?,

    vendorId: ObjectId?,

    notes: String?,

    createdByMembershipId: ObjectId,

    createdAt: Date,
    updatedAt: Date
}
```

---

# 56. Expense Categories

Possible values:

```text
VENUE
CATERING
PHOTOGRAPHY
VIDEOGRAPHY
DECORATION
CLOTHING
JEWELLERY
ENTERTAINMENT
INVITATIONS
GIFTS
TRAVEL
MAKEUP
OTHER
```

A future version may support custom categories.

---

# 57. Expense Integrity

If `eventId` exists:

```text
Expense.weddingId
=
Event.weddingId
```

If `vendorId` exists:

```text
Expense.weddingId
=
Vendor.weddingId
```

If `createdByMembershipId` exists:

```text
Expense.weddingId
=
Membership.weddingId
```

---

# 58. Expense Indexes

Recommended:

```javascript
index(weddingId, expenseDate)

index(weddingId, category)

index(weddingId, eventId)

index(weddingId, vendorId)
```

For dashboard calculations:

```text
SUM(amountPaise)
WHERE weddingId = currentWedding
```

No denormalized total is necessary initially.

---

# 59. Expense Deletion

Expenses can be hard deleted in V1.

If audit/history requirements emerge later, soft deletion can be introduced.

---

# 60. Photos Collection

## Collection

```text
photos
```

Stores metadata only.

Actual image data resides in Cloudflare R2.

---

## Suggested Schema

```javascript
Photo {
    _id: ObjectId,

    weddingId: ObjectId,

    eventId: ObjectId?,

    objectKey: String,

    originalFilename: String?,

    mimeType: String,

    sizeBytes: Number,

    uploaderType:
        "MEMBER"
        | "GUEST",

    uploadedByMembershipId: ObjectId?,

    createdAt: Date,
    updatedAt: Date
}
```

---

# 61. Photo Upload Ownership

Authenticated upload:

```text
uploaderType = MEMBER
uploadedByMembershipId = ...
```

Guest upload:

```text
uploaderType = GUEST
uploadedByMembershipId = null
```

Because the gallery link is shared across guests, we do not know which specific invited Guest uploaded the image.

That is acceptable for V1.

---

# 62. R2 Object Key

Store only the storage identifier:

```text
objectKey
```

Example:

```text
weddings/65abc.../photos/8d92...jpg
```

Do not persist temporary signed URLs.

Signed URLs expire and should be generated dynamically.

---

# 63. Photo Indexes

Recommended:

```javascript
unique(objectKey)

index(weddingId, createdAt)

index(weddingId, eventId, createdAt)
```

For gallery pagination, use an ordering such as:

```text
createdAt DESC
_id DESC
```

---

# 64. Photo Deletion

Photo deletion requires two operations:

```text
Delete R2 Object
+
Delete MongoDB Metadata
```

Preferred workflow:

```text
Attempt R2 deletion
    ↓
Delete metadata
```

Failure handling should prevent the UI from claiming success if the storage operation failed.

A cleanup process can later handle rare orphaned files.

---

# 65. Cover Images

Wedding and Event cover images can also live in R2.

Because each entity has at most one cover image, storing:

```text
coverImageObjectKey
```

directly inside Wedding/Event is preferable to creating a Photo record.

Photo collection is reserved for gallery photos.

---

# 66. Email Jobs Collection

## Collection

```text
email_jobs
```

Used only for asynchronous bulk email.

Examples:

```text
Guest Invitations
RSVP Reminders
```

Single password resets or single member invitations do not require this collection.

---

# 67. Suggested Email Job Schema

```javascript
EmailJob {
    _id: ObjectId,

    weddingId: ObjectId,

    type:
        "GUEST_INVITATION"
        | "RSVP_REMINDER",

    guestId: ObjectId,

    recipientEmail: String,

    status:
        "PENDING"
        | "PROCESSING"
        | "SENT"
        | "FAILED"
        | "CANCELLED",

    batchId: String?,

    idempotencyKey: String,

    attempts: Number,

    nextAttemptAt: Date?,

    lockedAt: Date?,

    lockId: String?,

    sentAt: Date?,

    providerMessageId: String?,

    lastError: String?,

    createdAt: Date,
    updatedAt: Date
}
```

---

# 68. Why One Job Per Email

For 500 guests:

```text
500 EmailJob documents
```

rather than:

```text
1 giant job containing 500 recipients
```

This makes:

- Individual retries easier
- Failures isolated
- Progress measurable
- Duplicate protection easier
- Cron processing simpler

---

# 69. Email Batch ID

When Admin clicks:

```text
Send Invitations to 500 Guests
```

generate:

```text
batchId
```

and attach it to all 500 jobs.

We do not need a separate `email_batches` collection initially.

Progress can be determined through:

```text
COUNT jobs WHERE batchId = X
GROUP BY status
```

---

# 70. Email Idempotency

Every email job should have a unique:

```text
idempotencyKey
```

Example conceptually:

```text
guestId + emailType + campaign identifier
```

This reduces accidental duplicate jobs.

Resend provider-level idempotency can additionally be used where appropriate.

---

# 71. Email Job Indexes

Critical indexes:

```javascript
unique(idempotencyKey)

index(status, nextAttemptAt, createdAt)

index(weddingId, status)

index(batchId)

index(guestId)
```

The first query performed by a worker will commonly be:

```text
status = PENDING
AND
nextAttemptAt <= now
```

---

# 72. Email Job Claiming

Cron processors must safely claim jobs.

Conceptually:

```text
findOneAndUpdate(
    {
        status: PENDING
    },
    {
        status: PROCESSING,
        lockedAt: now,
        lockId: workerId
    }
)
```

The update must be atomic.

This prevents two overlapping cron runs from processing the same job.

---

# 73. Recovering Stuck Jobs

A server execution may terminate after:

```text
PENDING → PROCESSING
```

but before sending.

Therefore jobs with:

```text
status = PROCESSING
AND
lockedAt < timeout
```

should become eligible for retry.

Example timeout:

```text
10–15 minutes
```

Exact value belongs in implementation configuration.

---

# 74. Retry Policy

Example:

```text
attempt 1
attempt 2
attempt 3
```

After maximum retries:

```text
status = FAILED
```

Potential retry scheduling:

```text
Attempt 1 → immediate
Attempt 2 → +5 minutes
Attempt 3 → +30 minutes
```

No sophisticated queue infrastructure is required.

---

# 75. Email Job Cleanup

Sent jobs do not need to remain forever.

A later cleanup strategy may delete:

```text
SENT / FAILED email jobs
older than 30–90 days
```

This is not required for initial launch but prevents endless growth.

---

# 76. No Separate RSVP Collection

V1 has exactly one current RSVP per Guest.

Therefore:

```text
Guest {
    rsvpStatus,
    attendingCount,
    rsvpUpdatedAt
}
```

is sufficient.

A separate RSVP collection would only be needed if we later require:

- RSVP history
- Per-person responses
- Per-event responses
- Audit trails

---

# 77. No Separate Website Collection

There is exactly one website configuration per Wedding.

Therefore embedding website config inside Wedding is preferable.

---

# 78. No Separate Gallery Collection

There is exactly one gallery per Wedding.

Gallery configuration belongs inside Wedding.

Photos remain separate because they are unbounded.

---

# 79. No Separate Livestream Collection

There is one current livestream configuration.

Embed inside Wedding.

---

# 80. Relationship Summary

| Parent | Child / Reference | Relationship |
|---|---|---|
| User | Session | 1:N |
| User | WeddingMembership | 1:1 in V1 |
| Wedding | WeddingMembership | 1:N |
| Wedding | MemberInvitation | 1:N |
| Wedding | Event | 1:N |
| Wedding | Task | 1:N |
| Wedding | Guest | 1:N |
| Wedding | Vendor | 1:N |
| Wedding | Expense | 1:N |
| Wedding | Photo | 1:N |
| Wedding | EmailJob | 1:N |
| Event | Task | 1:N optional |
| Event | Guest | N:N through Guest.eventIds |
| Event | Vendor | N:N through Vendor.eventIds |
| Event | Expense | 1:N optional |
| Event | Photo | 1:N optional |
| Vendor | Expense | 1:N optional |

---

# 81. Tenant Isolation Rule

This is the most important database-access rule.

Bad:

```javascript
Task.findById(taskId)
```

Preferred:

```javascript
Task.findOne({
    _id: taskId,
    weddingId: currentWeddingId
})
```

Apply the same pattern to:

```text
Events
Guests
Vendors
Expenses
Photos
```

The client should never decide which Wedding it is authorized to access.

---

# 82. Do Not Trust weddingId from the Client

An authenticated request might send:

```json
{
    "weddingId": "another-wedding-id"
}
```

The backend should ignore this for authorization.

Instead:

```text
Session
   ↓
User
   ↓
WeddingMembership
   ↓
currentWeddingId
```

The backend derives tenant context itself.

---

# 83. Cross-Entity Validation

MongoDB does not provide foreign-key constraints.

Therefore service-layer validation is required.

Example:

```text
Assign Task
    ↓
Load Event by
_id + weddingId
    ↓
Load Membership by
_id + weddingId
    ↓
Create Task
```

Never simply accept referenced ObjectIds from the frontend.

---

# 84. Transactions

MongoDB transactions should be used selectively.

Do not wrap every API call in a transaction.

Use transactions when several changes together represent one business operation.

---

# 85. Create Wedding Transaction

Operation:

```text
Create Wedding
+
Create Initial ADMIN Membership
```

Both should succeed together.

If Membership creation fails, the system should not leave an inaccessible Wedding behind.

---

# 86. Accept Member Invitation Transaction

Operation:

```text
Validate Invitation

Create WeddingMembership

Mark Invitation ACCEPTED
```

These should be atomic.

This also protects against two concurrent attempts to accept the same invitation.

---

# 87. Bulk Email Job Creation

Creating hundreds of email jobs does not necessarily require one giant MongoDB transaction.

Use:

```text
insertMany
```

with appropriate uniqueness/idempotency guarantees.

Large transactions should be avoided when they provide little business value.

---

# 88. Dashboard Queries

The dashboard can initially calculate values from primary collections.

Examples:

### Events

```text
count events
WHERE weddingId
AND archivedAt = null
```

### Tasks

```text
count all tasks
count completed tasks
```

### Guests

```text
count guests

count WHERE
rsvpStatus = ATTENDING
```

### Expenses

```text
SUM amountPaise
WHERE weddingId
```

### Vendors

```text
count vendors
WHERE archivedAt = null
```

This scale is completely reasonable for V1.

---

# 89. No Summary Counters Initially

Avoid fields such as:

```text
Wedding.totalGuestCount
Wedding.totalExpenses
Wedding.completedTasks
Wedding.photoCount
```

because every write then requires keeping derived data synchronized.

If dashboard queries later become expensive, selective denormalized counters can be introduced.

---

# 90. Pagination Strategy

Collections requiring pagination:

```text
Guests
Photos
Tasks
Expenses
Vendors
```

Guests are limited enough that ordinary pagination is acceptable.

Photos may reach several thousand per Wedding, so cursor-style pagination based on:

```text
createdAt
_id
```

is preferable for the gallery.

Exact API pagination design will be defined later.

---

# 91. Suggested Main Index Inventory

## Users

```text
emailNormalized UNIQUE
```

## Sessions

```text
tokenHash UNIQUE
userId
expiresAt TTL
```

## Password Reset

```text
tokenHash UNIQUE
userId
expiresAt TTL
```

## Weddings

```text
website.slug UNIQUE
gallery.tokenHash UNIQUE
```

## Memberships

```text
userId UNIQUE
weddingId + userId UNIQUE
weddingId + role
```

## Member Invitations

```text
tokenHash UNIQUE
weddingId + status
emailNormalized
expiresAt
```

## Events

```text
weddingId + startsAt
weddingId + archivedAt
```

## Tasks

```text
weddingId + status
weddingId + dueDate
weddingId + assignedMembershipId + status
weddingId + eventId
```

## Guests

```text
invitationToken UNIQUE
weddingId + rsvpStatus
weddingId + name
weddingId + emailNormalized
weddingId + invitedEventIds
```

## Vendors

```text
weddingId + category
weddingId + archivedAt
weddingId + googlePlaceId
```

## Expenses

```text
weddingId + expenseDate
weddingId + category
weddingId + vendorId
weddingId + eventId
```

## Photos

```text
objectKey UNIQUE
weddingId + createdAt
weddingId + eventId + createdAt
```

## Email Jobs

```text
idempotencyKey UNIQUE
status + nextAttemptAt + createdAt
weddingId + status
batchId
guestId
```

---

# 92. Soft Delete Strategy

We should not apply soft deletion to every collection.

That creates unnecessary query complexity.

Recommended:

| Entity | Strategy |
|---|---|
| User | No user deletion in initial V1 |
| Session | Hard delete / TTL |
| Wedding | Soft delete |
| Membership | Hard delete |
| Member Invitation | Keep status |
| Event | Archive |
| Task | Hard delete |
| Guest | Hard delete |
| Vendor | Archive |
| Expense | Hard delete |
| Photo | Hard delete + R2 object |
| Email Job | Status + eventual cleanup |

---

# 93. Why Wedding Uses Soft Delete

Deleting an entire Wedding could remove:

- Events
- Guests
- Expenses
- Thousands of photos
- Invitations
- Vendors

Accidental deletion would be catastrophic.

Therefore:

```javascript
deletedAt
```

is safer.

Actual permanent deletion can later become a separate administrative workflow.

---

# 94. Why Events Are Archived

Events have many incoming references.

Archiving avoids complicated cascades.

Example:

```text
Wedding event cancelled
     ↓
archive Event
```

Existing:

- Expenses
- Tasks
- Photo associations

remain historically understandable.

---

# 95. Why Vendors Are Archived

Expenses may reference Vendors.

If a vendor is removed from active planning, historical expense information should continue making sense.

---

# 96. Data Validation Layers

We will intentionally have two layers.

## Zod

Validates external application input.

Example:

```text
amount > 0
valid email
allowed task status
attendingCount <= maxGuests
```

## Mongoose

Protects database structure.

Example:

```text
required fields
enum values
basic number constraints
indexes
```

Business rules still belong primarily in services.

---

# 97. Enum Storage

Enums should be stored as readable strings.

Prefer:

```text
"IN_PROGRESS"
```

over:

```text
2
```

Reasons:

- Easier debugging
- Easier database inspection
- Safer future evolution
- More understandable logs

---

# 98. Token Storage Rules

Secret tokens should never normally be stored raw.

Applies to:

```text
Sessions
Password resets
Wedding Member invitations
Guest invitations
Gallery access
```

Database stores:

```text
tokenHash
```

URLs/cookies contain:

```text
raw token
```

---

# 99. Token Generation

Use cryptographically secure random generation.

Conceptually:

```javascript
crypto.randomBytes(...)
```

Do not use:

```javascript
Math.random()
```

for security-sensitive tokens.

---

# 100. Public Identifiers

Different resource types use different public identifiers.

```text
Wedding Website
→ slug

Guest Invitation
→ secret token

Gallery / QR
→ secret token

Internal Authenticated Entities
→ Mongo ObjectId
```

Authenticated ObjectIds are acceptable as long as authorization checks always include `weddingId`.

---

# 101. Photo Storage Responsibility

MongoDB owns:

```text
metadata
ownership
event relationship
timestamps
```

Cloudflare R2 owns:

```text
binary file
```

MongoDB should never contain Base64 wedding images or large photo binaries.

---

# 102. Storage Key Structure

Recommended object hierarchy:

```text
weddings/
   {weddingId}/
      covers/
      events/
      gallery/
```

Gallery example:

```text
weddings/{weddingId}/gallery/{randomFileId}.jpg
```

Do not rely on filenames supplied by guests as object identifiers.

---

# 103. Security Against Cross-Wedding File Upload

When generating an R2 upload URL:

```text
Authenticated Member
      ↓
derive weddingId from Membership
```

or:

```text
Guest Gallery Token
      ↓
derive weddingId from token
```

The client never arbitrarily chooses:

```text
/weddings/{someOtherWeddingId}
```

---

# 104. Guest Email Is Optional

A Guest can exist with:

```text
name
phone
```

without email.

The organiser can manually share their invitation through WhatsApp.

Therefore:

```text
email
```

is optional.

However:

```text
Send Email Invitation
```

requires Guest.email.

---

# 105. Phone Numbers

Phone numbers should initially be stored as strings.

Do not store as numeric values because:

- `+` is meaningful
- Leading zeros can matter
- Numeric arithmetic is irrelevant

Example:

```text
+919876543210
```

Normalization rules can be improved when WhatsApp/SMS integrations are introduced.

---

# 106. Data Ownership Summary

### User-owned

```text
Sessions
Password Reset Tokens
```

### Wedding-owned

```text
Memberships
Member Invitations
Events
Tasks
Guests
Vendors
Expenses
Photos
Email Jobs
```

### Embedded Wedding configuration

```text
Location
Website
Gallery
Livestream
```

---

# 107. Estimated Document Volumes

Approximate intended upper bounds per Wedding:

```text
Memberships
~5–20

Events
~5–20

Tasks
~50–500

Guests
~100–1,000

Vendors
~10–100

Expenses
~50–1,000

Photos
~0–5,000+

Email Jobs
potentially thousands over wedding lifecycle
```

These volumes strongly support separate collections for growing entities.

---

# 108. MongoDB Document Size

MongoDB's individual-document size limit should never become relevant with this design.

We deliberately avoid embedding:

```text
thousands of guests
thousands of photos
unbounded expense arrays
```

inside Wedding.

---

# 109. Referential Integrity Philosophy

Because MongoDB does not provide relational foreign keys:

> Every write involving references must be treated as a business operation rather than simply storing IDs received from the frontend.

Example:

```text
Create Expense

1. Authenticate
2. Determine Wedding
3. Validate Event belongs to Wedding
4. Validate Vendor belongs to Wedding
5. Validate Membership belongs to Wedding
6. Create Expense
```

This pattern is fundamental to the application.

---

# 110. Data Model Summary

The final V1 model is:

```text
User
├── Sessions
├── PasswordResetTokens
└── WeddingMembership
         │
         ▼
      Wedding
         │
         ├── Location
         ├── Website
         ├── Gallery
         ├── Livestream
         │
         ├── WeddingMemberInvitations
         ├── Events
         ├── Tasks
         ├── Guests
         │      ├── Invitation Token
         │      ├── Invited Events
         │      └── RSVP
         │
         ├── Vendors
         ├── Expenses
         ├── Photos → Cloudflare R2
         └── EmailJobs
```

---

# 111. Key Database Decisions

## Decision 1

**Wedding is the tenant boundary.**

Every private entity is queried using `weddingId`.

---

## Decision 2

**Use separate collections for unbounded data.**

Guests, tasks, vendors, expenses and photos are not embedded in Wedding.

---

## Decision 3

**Embed small 1:1 configuration.**

Website, gallery, livestream and wedding location remain inside Wedding.

---

## Decision 4

**Keep RSVP inside Guest.**

One guest has one current RSVP in V1.

---

## Decision 5

**Keep invitation information inside Guest.**

One guest has one stable invitation URL.

---

## Decision 6

**Use arrays for bounded Event relationships.**

Examples:

```text
Guest.invitedEventIds
Vendor.eventIds
```

The number of wedding events is naturally small.

---

## Decision 7

**Use WeddingMembership rather than storing role directly on User.**

This keeps domain modelling clean and future-friendly.

---

## Decision 8

**Use integer paise for monetary values.**

Avoid floating-point money calculations.

---

## Decision 9

**Use hashes for secret tokens.**

Session, invite, reset and gallery tokens should not be persisted raw.

---

## Decision 10

**Photos remain outside MongoDB.**

MongoDB stores only R2 object metadata.

---

## Decision 11

**Use MongoDB for lightweight email jobs.**

No Redis or dedicated queue infrastructure for V1.

---

## Decision 12

**Do not maintain denormalized dashboard counters initially.**

Calculate them using indexed queries and aggregations.

---

# 112. Final Collection List

The database design is finalized around:

```text
users

sessions

password_reset_tokens

weddings

wedding_memberships

wedding_member_invitations

events

tasks

guests

vendors

expenses

photos

email_jobs
```

Total:

**13 primary collections**

This is intentionally smaller than creating a collection for every product noun.

---

# 113. Next Step

With the data model frozen, the next design document should be:

## REST API Design

That document should define:

- Routes
- HTTP methods
- Authentication requirements
- Admin-only endpoints
- Request payloads
- Response payloads
- Pagination
- Filtering
- Validation
- Error format
- Guest-token endpoints
- Photo-upload endpoints
- Email batch endpoints

The API design should now be derived directly from this database model rather than inventing data structures independently.
## Organiser photo lifecycle extension — 2026-09-18

The initial Photo shape above described published metadata only. The first
implementation extends that same collection (not a separate queue service) with:

- `uploadKey`: unique server-issued staging object key, retained for idempotency.
- `status`: PENDING, READY, or DELETED; only READY rows enter gallery queries.
- `expiresAt`: PUT URL expiry; pending confirmation accepts a further 24 hours.
- `objectKey`: staging key while pending, replaced atomically with an independent
  final object key when the photo becomes READY.

The original member uploader, metadata, and optional event are recorded at
issuance. `createdAt` remains the reservation time and is the stable pagination
ordering key. Both objectKey and uploadKey have unique indexes. Listing indexes
are `(weddingId, status, createdAt DESC, _id DESC)` and
`(weddingId, status, eventId, createdAt DESC, _id DESC)`.

Deletion refines the earlier instruction to remove Photo metadata: the object
is deleted first, then metadata becomes a hidden DELETED tombstone rather than
being physically removed. This prevents late upload confirmations from
resurrecting deleted photos. There is no soft-delete/restore feature in the UI.

Concurrent confirmations copy to distinct final keys and compete for one atomic
PENDING-to-READY update. Losing copies are removed. An ambiguous database write
retains its verified object because it may already be referenced by a committed
READY record. Staging cleanup after successful confirmation is best effort.
Abandoned/replayed staging objects and ambiguous-write/cleanup-failure orphans
require a future reconciliation process; do not add a TTL that drops the only
metadata reference before object cleanup. No automated orphan cleanup is claimed.
