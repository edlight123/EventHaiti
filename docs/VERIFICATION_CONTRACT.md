# Verification Contract (Web + Admin)

This document defines the source-of-truth data model and invariants for organizer identity verification.

## Scope

Applies to:
- Organizer flow: `/organizer/verify`
- Admin flow: `/admin/verify` + related API routes
- Gating:
  - Publishing paid events
  - Payout eligibility checks

## Canonical Records

### 1) `verification_requests/{userId}` (Firestore)

**Purpose**: single source of truth for the verification request workflow and uploaded proof.

**Canonical fields** (preferred names):
- `userId: string`
- `status: VerificationRequestStatus`
- `steps: Record<stepId, VerificationStep>`
- `files: VerificationFiles`
- `submittedAt?: Timestamp`
- `reviewedAt?: Timestamp`
- `reviewNotes?: string | null`
- `createdAt: Timestamp`
- `updatedAt: Timestamp`

**Allowed `status` values (canonical)**
- `not_started`
- `in_progress`
- `pending_review`
- `in_review`
- `approved`
- `changes_requested`
- `rejected`

**Legacy compatibility**
- `pending` is legacy and should be treated as `pending_review` for display + filtering.

### 2) `users/{userId}` and `organizers/{userId}` (Firestore)

**Purpose**: fast “account verified?” flags used across the product.

**Contract**:
- `is_verified: boolean` MUST be `true` only when approved.
- `verification_status: string` SHOULD be:
  - `approved` when approved
  - `pending_review` when submitted and awaiting review
  - `none` (or absent) when not verified / not submitted

Notes:
- `verification_status` on these docs is a convenience cache; the workflow source of truth remains `verification_requests/{userId}`.

## Canonical Write Paths

### Organizer (client) — premium flow
- Writes `verification_requests/{userId}` via client Firestore SDK.
- Submitting for review MUST write:
  - `status = pending_review`
  - `submittedAt = serverTimestamp()`
  - `updatedAt = serverTimestamp()`

Implementation:
- [lib/verification.ts](../lib/verification.ts)

### Organizer (server) — legacy submit endpoint
If used, it MUST still adhere to canonical statuses.

Implementation:
- [app/api/organizer/submit-verification/route.ts](../app/api/organizer/submit-verification/route.ts)

Contract requirements:
- Must set `verification_requests/{userId}.status = pending_review`.
- Should set `users/{userId}` and `organizers/{userId}`:
  - `is_verified = false`
  - `verification_status = pending_review`

### Admin review endpoint
Implementation:
- [app/api/admin/review-verification/route.ts](../app/api/admin/review-verification/route.ts)

Contract requirements:
- Allowed admin decisions:
  - Approve → `verification_requests.status = approved`
  - Changes requested → `verification_requests.status = changes_requested` with `reviewNotes`
- Also update `users/{userId}` and `organizers/{userId}`:
  - If approved: `is_verified = true`, `verification_status = approved`
  - Else: `is_verified = false`, `verification_status = pending` or `pending_review` (product choice)

Important:
- Avoid overwriting entire user documents with stale payloads. Only update verification-related fields.

### Admin quick-toggle endpoint
Implementation:
- [app/api/admin/verify-organizer/route.ts](../app/api/admin/verify-organizer/route.ts)

Contract requirements:
- This is a manual override.
- If toggled verified:
  - `users/{id}` + `organizers/{id}` set `is_verified=true`, `verification_status=approved`
  - If `verification_requests/{id}` exists, set `status=approved`
- If toggled unverified:
  - `users/{id}` + `organizers/{id}` set `is_verified=false`, `verification_status=none`
  - If `verification_requests/{id}` exists, set `status=not_started` (do NOT force `rejected`)

## Read/Display Rules

### Organizer UI
- Should treat `pending` as `pending_review`.
- Should display read-only for statuses:
  - `pending_review`, `in_review`, `approved` (read-only viewing), and possibly `rejected` depending on restart UX.

### Admin UI
- “Pending queue” should include:
  - `pending_review`, `in_review` (and optionally legacy `pending`).

## Product Gating

### Publish paid events
Implementation:
- [app/api/events/[id]/publish/route.ts](../app/api/events/[id]/publish/route.ts)

Contract:
- Publishing paid events must require identity verification approved.
- Verification is considered approved if either:
  - `users/{id}.is_verified === true` OR `users/{id}.verification_status === approved`, OR
  - `verification_requests/{id}.status === approved`

### Payout eligibility
Implementation:
- [lib/firestore/payout.ts](../lib/firestore/payout.ts)

Contract:
- Identity verification should treat in-flight states as pending:
  - `pending`, `pending_review`, `in_review`, `changes_requested`

## Proof Files & Access

### Storage paths
Canonical storage paths:
- `verification/{userId}/{docType}_{timestamp}.{ext}`

### Admin proof viewing
Implementation:
- [app/api/admin/verification-image/route.ts](../app/api/admin/verification-image/route.ts)

Contract:
- Admin UI should use signed URLs for Storage paths.
- Legacy public URLs may still render, but new uploads should store paths (not public URLs).

## Security & Debug Routes

Debug endpoints must not expose cross-user data to non-admins.

Admin-only debug routes:
- [app/api/debug/verification-status/route.ts](../app/api/debug/verification-status/route.ts)
- [app/api/debug/user-record/route.ts](../app/api/debug/user-record/route.ts)
- [app/api/debug/tickets/route.ts](../app/api/debug/tickets/route.ts)

## Migration Guidance

- Treat existing `verification_requests.status = pending` as `pending_review`.
- Treat existing `users.verification_status = pending` as `pending_review`.

Optional migration endpoint:
- [app/api/admin/migrate-verification-status/route.ts](../app/api/admin/migrate-verification-status/route.ts)
