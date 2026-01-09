# Admin Verify Troubleshooting

This doc is for diagnosing cases where `/admin/verify` shows fewer verification requests than expected (for example, only one email appears).

## Quick facts

- The admin verify queue reads from Firestore collection: `verification_requests`.
- The document id is typically the organizer `userId`.
- Status values in the wild may include:
  - Pending-like: `pending_review`, `in_review`, `in_progress`, and legacy `pending`
  - Non-pending: `changes_requested`, `approved` (and legacy `rejected`)

## Step 1 — Confirm requests exist in Firestore

While logged in as an admin in the deployed app, open:

- `/api/admin/debug-verifications`

This returns a list of `verification_requests` and a status breakdown. If the list/count is small, the issue is usually data not being written to Firestore (or written to a different place).

## Step 2 — Check a specific organizer by email

While logged in, open:

- `/api/debug/check-verification?email=<email>`

This helps confirm:
- the `users` document is found for that email
- the `verification_requests/{userId}` document exists
- the `status` and timestamp fields look as expected

## Step 3 — Status mismatch / legacy statuses

If requests exist but don’t appear under the Pending tab:

- Verify the request `status` field is one of: `pending_review`, `in_review`, `in_progress`, `pending`.
- If you see legacy `pending`, run the migration endpoint:
  - `/api/admin/migrate-verification-status`

If you see requests with missing/unknown `status` but with a submission timestamp, the admin page includes a bounded fallback query to try to surface these.

## Step 4 — Confirm the write path

There are two main submission paths:

1) “New” client-driven flow (Firestore client SDK)
- Writes directly to `verification_requests/{userId}` and sets `status: pending_review`.

2) Legacy server endpoint
- `/api/organizer/submit-verification`
- Writes to Supabase and *attempts* to mirror to Firestore.

If Supabase has rows but Firestore does not, the mirror step is failing (often due to Firebase Admin credentials/config in the server environment).

## Step 5 — Verify server credentials/config (deployment)

If the Firestore mirror or admin endpoints are failing in production:

- Confirm Firebase Admin credentials are configured in the server environment (Vercel/hosting env vars).
- Check the server logs for `adminDb` initialization failures.

## Step 6 — Sanity checks

- Confirm the organizer’s `users/{userId}` doc exists.
- Confirm the doc id used in `verification_requests` matches the organizer’s `userId`.
- Confirm timestamps exist (`submittedAt`/`submitted_at`/`createdAt`/`created_at`) for ordering.
