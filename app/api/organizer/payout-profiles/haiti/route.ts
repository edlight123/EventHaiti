import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPayoutProfile } from '@/lib/firestore/payout-profiles'
import { updatePayoutProfileConfig } from '@/lib/firestore/payout'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest) {
  try {
    const { user, error } = await requireAuth('organizer')
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await getPayoutProfile(user.id, 'haiti')
    return NextResponse.json({ profile })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Failed to load payout profile', message: e?.message || String(e) },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth('organizer')
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))

    const methodRaw = String(body?.method || '').toLowerCase()
    const method = (methodRaw === 'mobile_money' ? 'mobile_money' : 'bank_transfer') as
      | 'bank_transfer'
      | 'mobile_money'

    const allowInstantMoncash = typeof body?.allowInstantMoncash === 'boolean' ? body.allowInstantMoncash : undefined

    const bankDetails = body?.bankDetails
      ? {
          accountLocation: 'haiti',
          accountName: String(body.bankDetails.accountName || ''),
          accountNumber: String(body.bankDetails.accountNumber || ''),
          bankName: String(body.bankDetails.bankName || ''),
          routingNumber: body.bankDetails.routingNumber ? String(body.bankDetails.routingNumber) : undefined,
          swift: body.bankDetails.swift ? String(body.bankDetails.swift) : undefined,
          iban: body.bankDetails.iban ? String(body.bankDetails.iban) : undefined,
        }
      : undefined

    const mobileMoneyDetails = body?.mobileMoneyDetails
      ? {
          provider: String(body.mobileMoneyDetails.provider || 'moncash'),
          phoneNumber: String(body.mobileMoneyDetails.phoneNumber || ''),
          accountName: String(body.mobileMoneyDetails.accountName || ''),
        }
      : undefined

    // Basic validation to avoid writing empty configs.
    if (method === 'bank_transfer') {
      if (!bankDetails?.accountName || !bankDetails?.accountNumber || !bankDetails?.bankName) {
        return NextResponse.json({ error: 'Incomplete bank details' }, { status: 400 })
      }
    }

    if (method === 'mobile_money') {
      if (!mobileMoneyDetails?.phoneNumber || !mobileMoneyDetails?.accountName) {
        return NextResponse.json({ error: 'Incomplete mobile money details' }, { status: 400 })
      }
    }

    const payoutProvider = (() => {
      if (method === 'bank_transfer') return 'bank_transfer'
      const provider = String(mobileMoneyDetails?.provider || 'moncash').toLowerCase()
      return provider === 'natcash' ? 'natcash' : 'moncash'
    })()

    const updateResult = await updatePayoutProfileConfig(user.id, 'haiti', {
      payoutProvider: payoutProvider as any,
      accountLocation: 'haiti',
      method,
      bankDetails: method === 'bank_transfer' ? (bankDetails as any) : undefined,
      mobileMoneyDetails: method === 'mobile_money' ? (mobileMoneyDetails as any) : undefined,
      allowInstantMoncash,
    })

    if (!updateResult.success) {
      return NextResponse.json(
        { error: 'Failed to save payout settings', message: updateResult.error || 'Unknown error' },
        { status: 500 }
      )
    }

    const profile = await getPayoutProfile(user.id, 'haiti')
    return NextResponse.json({ success: true, profile })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Failed to update payout profile', message: e?.message || String(e) },
      { status: 500 }
    )
  }
}
