import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import {
  addSecondaryBankDestination,
  listBankDestinations,
  type BankDestinationDetails,
} from '@/lib/firestore/payout-destinations'
import {
  consumePayoutDetailsChangeVerification,
  requireRecentPayoutDetailsChangeVerification,
} from '@/lib/firestore/payout'

const normalizeName = (value: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const nameMatchesOrganizer = (accountHolder: string, organizerNames: string[]): boolean => {
  const holder = normalizeName(accountHolder)
  if (!holder) return false

  const candidates = organizerNames.map(normalizeName).filter(Boolean)
  for (const candidate of candidates) {
    if (!candidate) continue
    if (holder === candidate) return true
    if (holder.includes(candidate) || candidate.includes(holder)) return true
  }

  return false
}

export async function GET(_req: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const destinations = await listBankDestinations(user.id)
    return NextResponse.json({ destinations })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Failed to load bank destinations', message: e?.message || String(e) },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const bankDetails = body?.bankDetails as BankDestinationDetails | undefined

    if (!bankDetails?.accountNumber || !bankDetails?.bankName || !bankDetails?.accountHolder) {
      return NextResponse.json({ error: 'Incomplete bank details' }, { status: 400 })
    }

    // Require OTP step-up when adding a new bank destination.
    try {
      await requireRecentPayoutDetailsChangeVerification(user.id)
    } catch (e: any) {
      const message = String(e?.message || '')
      if (message.includes('PAYOUT_CHANGE_VERIFICATION_REQUIRED')) {
        return NextResponse.json(
          {
            error: 'Verification required',
            code: 'PAYOUT_CHANGE_VERIFICATION_REQUIRED',
            requiresVerification: true,
            message:
              'For your security, confirm this new bank account with the code we email you before using it for withdrawals.',
          },
          { status: 403 }
        )
      }
      throw e
    }

    // Enforce basic ownership naming rule.
    const [userDoc, organizerDoc] = await Promise.all([
      adminDb.collection('users').doc(user.id).get(),
      adminDb.collection('organizers').doc(user.id).get(),
    ])

    const userData = userDoc.exists ? (userDoc.data() as any) : null
    const organizerData = organizerDoc.exists ? (organizerDoc.data() as any) : null

    const organizerNames = [
      userData?.full_name,
      userData?.name,
      userData?.displayName,
      organizerData?.organizationName,
      organizerData?.legalName,
    ].filter(Boolean)

    if (!nameMatchesOrganizer(bankDetails.accountHolder, organizerNames)) {
      return NextResponse.json(
        {
          error: 'Bank account name mismatch',
          message:
            'For security, the bank account holder name must match your organizer legal name (or organization name).',
        },
        { status: 400 }
      )
    }

    const created = await addSecondaryBankDestination({ organizerId: user.id, bankDetails })
    await consumePayoutDetailsChangeVerification(user.id)

    return NextResponse.json({ success: true, destinationId: created.id })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Failed to add bank destination', message: e?.message || String(e) },
      { status: 500 }
    )
  }
}
