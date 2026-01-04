import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPayoutProfile } from '@/lib/firestore/payout-profiles'

export const runtime = 'nodejs'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY)
}

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await requireAuth('organizer')
    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const organizerId = user.id

    const profile = await getPayoutProfile(organizerId, 'stripe_connect')
    const stripeAccountId = profile?.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json(
        {
          connected: false,
          status: 'not_connected',
        },
        { status: 200 }
      )
    }

    const stripe = getStripe()
    const account = await stripe.accounts.retrieve(stripeAccountId)

    const requirementsCurrentlyDue = Array.isArray(account?.requirements?.currently_due)
      ? account.requirements.currently_due
      : []

    const requirementsEventuallyDue = Array.isArray(account?.requirements?.eventually_due)
      ? account.requirements.eventually_due
      : []

    const disabledReason = account?.requirements?.disabled_reason || null

    const derivedStatus = (() => {
      if (account.details_submitted && account.charges_enabled && account.payouts_enabled) return 'verified'
      if (disabledReason) return 'requires_more_info'
      if (requirementsCurrentlyDue.length > 0 || requirementsEventuallyDue.length > 0) return 'incomplete'
      return 'in_review'
    })()

    return NextResponse.json({
      connected: true,
      stripeAccountId,
      status: derivedStatus,
      account: {
        country: account.country,
        detailsSubmitted: Boolean(account.details_submitted),
        chargesEnabled: Boolean(account.charges_enabled),
        payoutsEnabled: Boolean(account.payouts_enabled),
        disabledReason,
        requirements: {
          currentlyDue: requirementsCurrentlyDue,
          eventuallyDue: requirementsEventuallyDue,
        },
      },
    })
  } catch (error: any) {
    const statusCode = Number(error?.statusCode) || Number(error?.raw?.statusCode) || 500
    const rawMessage = String(error?.raw?.message || error?.message || 'Failed to fetch Stripe status')
    console.error('Stripe status error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch Stripe status',
        message: rawMessage,
        stripe: {
          requestId: error?.requestId || error?.raw?.requestId,
          type: error?.type || error?.rawType,
        },
      },
      { status: statusCode }
    )
  }
}
