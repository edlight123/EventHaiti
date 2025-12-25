import { adminDb } from '@/lib/firebase/admin'
import type { PayoutConfig } from '@/lib/firestore/payout'
import { determinePayoutStatus, getOrganizerIdentityVerificationStatus } from '@/lib/firestore/payout'
import { normalizeCountryCode } from '@/lib/payment-provider'

export type PayoutProfileId = 'haiti' | 'stripe_connect'

export function getRequiredPayoutProfileIdForEventCountry(country: unknown): PayoutProfileId {
  const code = normalizeCountryCode(country)
  if (code === 'US' || code === 'CA') return 'stripe_connect'
  // Default everything else to Haiti payout profile.
  return 'haiti'
}

export function getPayoutProfileRef(organizerId: string, profileId: PayoutProfileId) {
  return adminDb.collection('organizers').doc(organizerId).collection('payoutProfiles').doc(profileId)
}

function convertTimestamp(value: any, fallback: string = new Date().toISOString()): string {
  if (!value) return fallback
  if (value.toDate && typeof value.toDate === 'function') {
    return value.toDate().toISOString()
  }
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  try {
    return new Date(value).toISOString()
  } catch {
    return fallback
  }
}

async function computeVerificationStatus(organizerId: string, raw: any | null): Promise<PayoutConfig['verificationStatus']> {
  const organizerIdentityStatus = await getOrganizerIdentityVerificationStatus(organizerId)

  const verificationDocs = await adminDb
    .collection('organizers')
    .doc(organizerId)
    .collection('verificationDocuments')
    .get()

  const derived: NonNullable<PayoutConfig['verificationStatus']> = {
    identity: organizerIdentityStatus,
    bank: 'pending',
    phone: 'pending',
  }

  verificationDocs.docs.forEach((doc: any) => {
    const docData = doc.data()
    const type = doc.id as 'identity' | 'bank' | 'phone'
    if (!(type in derived)) return
    if (type === 'identity' && organizerIdentityStatus === 'verified') return
    derived[type] = docData.status || 'pending'
  })

  return {
    identity: derived.identity,
    bank: derived.bank !== 'pending' ? derived.bank : (raw?.verificationStatus?.bank || 'pending'),
    phone: derived.phone !== 'pending' ? derived.phone : (raw?.verificationStatus?.phone || 'pending'),
  }
}

function normalizeProfile(raw: any | null): PayoutConfig {
  const now = new Date().toISOString()
  return {
    status: raw?.status || 'not_setup',
    accountLocation: raw?.accountLocation || raw?.bankDetails?.accountLocation || undefined,
    payoutProvider: raw?.payoutProvider,
    stripeAccountId: raw?.stripeAccountId,
    allowInstantMoncash: typeof raw?.allowInstantMoncash === 'boolean' ? raw.allowInstantMoncash : undefined,
    method: raw?.method,
    payoutHoldUntil: raw?.payoutHoldUntil ? convertTimestamp(raw.payoutHoldUntil) : undefined,
    bankDetails: raw?.bankDetails,
    mobileMoneyDetails: raw?.mobileMoneyDetails,
    verificationStatus: raw?.verificationStatus,
    createdAt: convertTimestamp(raw?.createdAt, now),
    updatedAt: convertTimestamp(raw?.updatedAt, now),
  }
}

/**
 * Load a payout profile. Falls back to legacy payoutConfig/main when the profile doc does not exist.
 */
export async function getPayoutProfile(organizerId: string, profileId: PayoutProfileId): Promise<PayoutConfig | null> {
  const profileSnap = await getPayoutProfileRef(organizerId, profileId).get()
  const legacySnap = await adminDb
    .collection('organizers')
    .doc(organizerId)
    .collection('payoutConfig')
    .doc('main')
    .get()

  const legacy = legacySnap.exists ? (legacySnap.data() as any) : null

  const raw = (() => {
    if (profileSnap.exists) return profileSnap.data() as any

    // Backward compat: infer profile from existing payoutConfig/main.
    const legacyProvider = String(legacy?.payoutProvider || '').toLowerCase()
    const legacyLocation = String(legacy?.accountLocation || legacy?.bankDetails?.accountLocation || '').toLowerCase()
    const legacyIsStripeConnect = legacyProvider === 'stripe_connect' || legacyLocation === 'united_states' || legacyLocation === 'canada'

    if (profileId === 'stripe_connect') {
      return legacyIsStripeConnect ? legacy : null
    }

    // Haiti profile should ignore legacy Stripe Connect configs.
    return legacy && !legacyIsStripeConnect ? legacy : null
  })()

  if (!raw) return null

  const base = normalizeProfile(raw)

  // Only Haiti profile uses internal verification documents.
  const verificationStatus =
    profileId === 'haiti' ? await computeVerificationStatus(organizerId, raw) : base.verificationStatus

  const merged: PayoutConfig = {
    ...base,
    verificationStatus: verificationStatus as any,
  }

  return {
    ...merged,
    status: determinePayoutStatus(merged),
  }
}

/**
 * Convenience: whether organizer has any payout profile set up.
 */
export async function hasAnyPayoutProfile(organizerId: string): Promise<boolean> {
  const [haiti, stripe] = await Promise.all([
    getPayoutProfileRef(organizerId, 'haiti').get(),
    getPayoutProfileRef(organizerId, 'stripe_connect').get(),
  ])
  if (haiti.exists || stripe.exists) return true

  // Fallback to legacy
  const legacy = await adminDb
    .collection('organizers')
    .doc(organizerId)
    .collection('payoutConfig')
    .doc('main')
    .get()
  return legacy.exists
}
