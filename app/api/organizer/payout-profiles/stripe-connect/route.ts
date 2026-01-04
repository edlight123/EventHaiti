import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPayoutProfile } from '@/lib/firestore/payout-profiles'

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await requireAuth('organizer')
    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const profile = await getPayoutProfile(user.id, 'stripe_connect')
    return NextResponse.json({ profile }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Failed to load Stripe payout profile', message: e?.message || String(e) },
      { status: 500 }
    )
  }
}
