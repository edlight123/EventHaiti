# Organizer + Admin KYC Enablement Plan

> Goal: Use the existing payout + verification backend logic to ensure organizers only see payout setup prompts when necessary, and give admins a clear review workflow before payouts become active.

---

## 1. Current Data & Backend Connections

| Purpose | File(s) | Connection Details |
| --- | --- | --- |
| Firebase Admin SDK wrapper | `lib/firebase/admin.ts` | Exposes `adminDb`, `adminAuth`, `adminStorage`. All server components/API routes import from here. |
| Organizer payout helpers | `lib/firestore/payout.ts`, `lib/firestore/payout-profiles.ts` | `payout.ts` defines shared types/status helpers; `payout-profiles.ts` reads `organizers/{id}/payoutProfiles/{haiti|stripe_connect}` with legacy fallback to `payoutConfig/main`. Haiti profile verification is derived from `verificationDocuments/*` + `verification_requests/*`. |
| Organizer auth/SSR checks | `app/organizer/page.tsx`, `app/organizer/settings/payouts/page.tsx` | Use `requireAuth` or `adminAuth.verifySessionCookie` + `cookies()` to guard access. |
| Organizer verification submissions | `app/api/organizer/submit-identity-verification`, `submit-bank-verification`, `submit-phone-verification`, `send-phone-verification-code` | Write proof docs to `organizers/{id}/verificationDocuments`. Need to keep statuses pending until admin approval. |
| Admin review tooling | `app/admin/bank-verifications/page.tsx`, `components/admin/BankVerificationReviewCard.tsx`, `app/api/admin/approve-bank-verification/route.ts` | Lists submissions via `adminDb`, lets admin approve/reject and updates `verificationDocuments/bank`. Haiti profile status derives from those docs. |
| Organizer payout UI | `components/organizer/PayoutsWidget.tsx`, `components/payout/PayoutStatusHero.tsx`, `components/payout/VerificationChecklist.tsx`, `components/payout/PayoutMethodCard.tsx` | Present state derived from payout config + verification docs. |

_We will keep using these helpers—no new clients or services are required._

---

## 2. Data Model Expectations

- **Payout Profiles (`organizers/{id}/payoutProfiles/{profileId}`)**
   - `haiti` profile: `method` (`bank_transfer` | `mobile_money`), details (`bankDetails`/`mobileMoneyDetails`), and a derived `status` based on verification docs.
   - `stripe_connect` profile: `stripeAccountId` and Stripe account readiness (charges/payouts enabled).
- **Legacy Config (`organizers/{id}/payoutConfig/main`)**
   - Backward compatibility only. Prefer profiles for new behavior.
- **Verification Docs (`organizers/{id}/verificationDocuments/{identity|bank|phone}`)**
  - `status`: `'pending' | 'verified' | 'failed'`.
  - `submittedAt`, `reviewedAt`, `reviewedBy`, `rejectionReason`, `document metadata`.
- **Organizer Verification (`verification_requests/{id}`)**
   - Already managed by `/organizer/verify`; identity status is read and merged into the Haiti profile verification state.

Derived helpers we need everywhere:

```ts
const hasPayoutMethod = Boolean(config?.method && (config?.bankDetails || config?.mobileMoneyDetails));
const requiresBankVerification = config?.method === 'bank_transfer';
const requiresPhoneVerification = config?.method === 'mobile_money';
const allRequiredStepsVerified = (
  (!requiresBankVerification || config?.verificationStatus?.bank === 'verified') &&
  (!requiresPhoneVerification || config?.verificationStatus?.phone === 'verified') &&
  (config?.verificationStatus?.identity === 'verified')
);
```

Then determine status:

```ts
function determinePayoutStatus(config: PayoutConfig | null): PayoutStatus {
  if (!config || !hasPayoutMethod) return 'not_setup';
  if (config.status === 'on_hold') return 'on_hold';
  return allRequiredStepsVerified ? 'active' : 'pending_verification';
}
```

---

## 3. Organizer Flow Setup

1. **Display accurate status on dashboard (`app/organizer/page.tsx`).**
   - Fetch payout profiles alongside stats (`getPayoutProfile(user.id, 'haiti')` and `getPayoutProfile(user.id, 'stripe_connect')`).
   - Replace hard-coded `hasPayoutSetup = false` with the derived helper.
   - Action Center alert:
     - Show "Payouts not set up" only when status is `not_setup`.
     - Show "Payout verification pending" when `status === 'pending_verification'`.
   - `<PayoutsWidget>` should render whenever a method exists, with `status` prop reflecting `determinePayoutStatus` and placeholder balances sourced from `getOrganizerBalance` (already used on payouts settings page).

2. **Keep payout status in sync when organizers submit docs.**
   - `submit-bank-verification`, `submit-identity-verification`, `submit-phone-verification` routes should:
     - Store metadata in `verificationDocuments` with `status: 'pending'`.
   - Do not write `payoutConfig.verificationStatus.*` directly; the Haiti profile status is derived from verification docs.

3. **Verification Checklist feedback (`components/payout/VerificationChecklist.tsx`).**
   - Already surfaces statuses; ensure we refresh after submissions (UI triggers `window.location.reload()`, which re-fetches data server-side).
   - For failed steps, highlight admin-provided `rejectionReason` (extend checklist UI to show message).

4. **Payout Method card (`components/payout/PayoutMethodCard.tsx`).**
   - After saving method via `PayoutSetupStepper`, run the same helper to set `payoutConfig.status` to `'pending_verification'` (done in server action `updatePayoutConfig`).

---

## 4. Admin Flow Setup

1. **Visibility of submissions.**
   - `/admin/bank-verifications/page.tsx` already lists docs using `adminDb`. Keep using same collection.
   - (Optional future) Mirror the page for identity/phone; for now, bank is the gating factor for payouts.

2. **Decision handling.**
   - `/api/admin/approve-bank-verification` updates `verificationDocuments/bank`.
   - The Haiti profile status becomes `'active'` automatically once all required steps are verified.

3. **Admin awareness.**
   - Add a Firestore field `payoutConfig.awaitingManualReview = true` when organizer submits docs; remove when admin acts. This can drive an alert badge in `/admin/bank-verifications`.

4. **Audit trail.**
   - Ensure admin routes capture `reviewedAt`, `reviewedBy`, `rejectionReason` (already present but document in this plan for clarity).

---

## 5. Implementation Checklist

1. **Utility Updates**
   - Add `determinePayoutStatus` + helper booleans to `lib/firestore/payout.ts` (export for reuse).
   - Update submission APIs to leave statuses pending and set `payoutConfig.status` accordingly.
   - Extend admin approve API to call `maybeActivatePayouts(organizerId)` which checks all statuses + method.

2. **Organizer Dashboard**
   - Fetch payout config and balance.
   - Drive alerts + `<PayoutsWidget>` status via helpers.

3. **Payout Settings Page**
   - Pass computed status into `PayoutStatusHero` + checklist.
   - Show `BalanceRow` whenever `hasPayoutMethod` (already done) and ensure CTA text matches status.

4. **Documentation (done via this file).**
   - Keep `docs/KYC_IMPLEMENTATION_PLAN.md` updated as we build.

5. **Testing**
   - Organizer sets bank method → sees pending alert, admin view shows new submission.
   - Admin approves → organizer dashboard & settings reflect "active" without “not set up” messaging.
   - Admin rejects → checklist shows failed status + reason, dashboard alert prompts resubmission.

---

## 6. Next Steps After Plan Approval

1. Implement helper + API changes.
2. Wire organizer dashboard + widget to real data.
3. Add organizer/admin UI messaging for pending/failed states.
4. Smoke test with sample Firestore data.
5. Update deployment checklist to mention manual bank approval requirement.

This plan keeps all logic within the existing Firebase Admin-backed routes/components, satisfying the requirement to “use existing backend logic” while clarifying every database touchpoint involved in payout KYC.
