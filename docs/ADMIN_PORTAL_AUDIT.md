# Admin Portal Audit (Firestore + Legacy Boundaries)

This document summarizes the current admin portal implementation, its data sources, remaining legacy dependencies, and known schema mismatches.

## Auth + Security Model

- **Canonical admin check**: `isAdmin(email)` (reads `ADMIN_EMAILS` allowlist from environment, no hard-coded fallbacks).
- **Server-side gating expectation**:
  - Admin *pages* should gate in the server component (`getCurrentUser()` or `requireAuth()` + `isAdmin()`), then render client UIs.
  - Admin *API routes* should gate on the server (`requireAuth()`/`getCurrentUser()` + `isAdmin()`), never rely on client checks.

## Admin Pages → Data Sources

### /admin (Dashboard)
- **Reads** (Firestore, via `lib/firestore/admin.ts`):
  - `users` (count)
  - `events` (count + recent events)
  - `tickets` (count + 7-day metrics)
  - `verification_requests` (pending preview)
  - `platform_stats_daily` (7-day rollups)
- **Also reads**: recent admin activities via `lib/admin/audit-log`.

### /admin/verify (Organizer verification review)
- **Reads** (Firestore Admin SDK):
  - `verification_requests`
  - `users`
- **Writes** (via admin APIs): approval/rejection updates to canonical verification fields (see `docs/VERIFICATION_CONTRACT.md`).

### /admin/analytics (Platform analytics)
- **Reads** (Firestore Admin SDK):
  - `users`, `events`, `tickets` aggregate counts
  - `platform_stats_daily` (GMV/revenue sum via daily rollups)
- **Note**: UI widget `AdminRevenueAnalytics` loads data from `/api/admin/revenue-analytics` (Firestore-backed).

### /admin/events (Moderation console)
- **Reads/Writes** (Firestore via `/api/admin/events/*`):
  - `events` (legacy snake_case fields used heavily: `created_at`, `start_datetime`, `is_published`, `organizer_id`, etc.)
  - `tickets` (for per-event counts; legacy field `event_id` appears in use)
  - `users` (organizer lookups)
- **Limitation**: `reports_count` is currently hard-coded to 0 in the list API (no reports collection wired).

#### Incident recovery: restore deleted events

Admin moderation delete actions currently perform **hard deletes** of Firestore `events/{id}` docs.

If events were deleted accidentally and the legacy Supabase `events` table still has the rows, you can rehydrate Firestore via:

- `POST /api/admin/events/restore-from-legacy`
  - Body: `{ "limit": 500, "since": "<ISO timestamp>", "onlyMissing": true, "dryRun": false }`
  - Writes both snake_case and camelCase datetime fields for compatibility.

### /admin/payouts
- **Reads** (Firestore Admin SDK):
  - `organizers/*/payouts` (collectionGroup, status=pending)
  - `users/{organizerId}` (organizer identity)
  - `organizers/{organizerId}/payoutConfig/main`

### /admin/withdrawals
- **Reads/Writes** (Firestore via `/api/admin/withdrawals`):
  - `withdrawal_requests`
  - `events` (for display metadata)
  - `users` (organizer identity)
  - `event_earnings` (refund-on-reject/fail path)
- **Notable legacy handling**: withdrawal amounts are normalized with a heuristic (dollars vs cents) in the API.

### /admin/bank-verifications
- **Reads** (Firestore Admin SDK):
  - `users` filtered by `role == organizer`
  - `organizers/{organizerId}/verificationDocuments/bank`
  - `organizers/{organizerId}/payoutConfig/main` (bank details)

### /admin/security
- **Reads/Writes**: via `/api/admin/suspicious-activities` (see Legacy Boundaries below).

### /admin/users
- **Reads**: Firestore (client/server split depends on `AdminUsersClient.tsx`; expected source is `users`).

### /admin/debug-db and /admin/create-test-data
- **Purpose**: internal tools.
- **Reads/Writes**: Firestore client SDK, but **server-gated** by admin check in the page.

## Admin API Routes → Data Sources

### Firestore-first routes (preferred)
- `/api/admin/revenue-analytics`: Firestore `tickets` + rollups (via `lib/admin/revenue-analytics.ts`).
- `/api/admin/withdrawals`: Firestore `withdrawal_requests`, `events`, `users`, `event_earnings`.
- `/api/admin/events/*`: Firestore `events`, `tickets`, `users`.
- `/api/admin/events/restore-from-legacy`: restores Firestore `events/{id}` docs from legacy Supabase `events` rows.
- `/api/admin/review-verification`, `/api/admin/verify-organizer`, `/api/admin/verification-image/*`: Firestore verification pipeline.
- `/api/admin/suspicious-activities/backfill`: one-time migration helper (copies legacy Supabase rows into Firestore `suspicious_activities`).

### Legacy boundary routes (still Supabase-style via `createClient()`)
- `/api/admin/suspicious-activities`
  - **Migration path implemented**: Firestore-first read/update from `suspicious_activities` collection, with fallback to the legacy Supabase table.
  - Legacy fallback reads/writes **Supabase table**: `suspicious_activities` (+ join to `users` table).
- `/api/admin/analytics` + `lib/admin-analytics.ts`
  - Legacy Supabase-table based module (`users`, `tickets`, `events`, `event_favorites`, `event_reviews`, …).
  - The API route is now **deprecated** (returns HTTP 410) in favor of Firestore-backed analytics.

## Firestore Schema Notes (Observed)

The codebase currently operates on **mixed schemas** (camelCase + snake_case) depending on the feature.

Commonly observed collections and fields:

- `users`
  - identity: `email`, `full_name`
  - role: `role` (`organizer`, `attendee`, …)
  - verification: `is_verified`, `verification_status`
  - timestamps: `createdAt` *and/or* `created_at`

- `events`
  - mixed time fields:
    - camelCase: `startDateTime`
    - snake_case: `start_datetime`, `end_datetime`, `created_at`
  - publication/moderation (legacy): `is_published`, `rejected`

- `tickets`
  - status: `confirmed` / `valid` / `cancelled` (mixed legacy)
  - event FK: sometimes appears as `event_id`

- `verification_requests`
  - user FK variants: `userId` vs `user_id` (and some code defensively checks doc ID)
  - status variants: `pending_review` (canonical) + legacy aliases

- `organizers/{id}/payoutConfig/main`
  - payout settings, bank details, etc.

- `organizers/{id}/verificationDocuments/bank`
  - bank verification submission metadata.

- `withdrawal_requests`
  - withdrawal workflow and audit fields.

- `event_earnings`
  - settlement/withdrawal tracking (`availableToWithdraw`, `withdrawnAmount`, …).

- `platform_stats_daily`
  - platform rollups used by admin dashboard/analytics.

## Admin vs Organizer Limitations (Practical Gaps)

- **Event moderation uses legacy field names** (`is_published`, `created_at`, `start_datetime`, `organizer_id`). Organizer flows may prefer camelCase fields, so tooling must keep tolerating both.
- **Reports/abuse signals are incomplete**: moderation UI shows `reports_count` but the list API currently hard-codes it.
- **Security dashboard is a legacy boundary**: suspicious activity review depends on the legacy `suspicious_activities` table.
- **Security dashboard migration path**: endpoint prefers Firestore if populated, else falls back to legacy.
- **Security logging**: `logSuspiciousActivity()` now writes to Firestore `suspicious_activities` first (legacy fallback still attempts Supabase insert).
- **Analytics fragmentation**:
  - Modern revenue analytics is Firestore-backed (`/api/admin/revenue-analytics`).
  - The older “platform insights” analytics module is Supabase-table backed (`lib/admin-analytics.ts`), and the API route is deprecated.

## Recommendations (Next Migration Targets)

1. **Decide ownership of suspicious activity logging**
   - If Firestore is the target source of truth, define `suspicious_activities` as a Firestore collection and migrate `/api/admin/suspicious-activities`.
2. **Either migrate or formally deprecate `/api/admin/analytics`**
   - It is legacy Supabase-table based and appears unused by the current UI.
3. **Continue schema normalization**
   - Prefer writing camelCase fields going forward, but keep read-time fallbacks where legacy docs exist.
