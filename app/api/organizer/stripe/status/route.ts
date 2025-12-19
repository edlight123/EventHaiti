import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY)
}

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const organizerId = decodedClaims.uid

    const configSnap = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payoutConfig')
      .doc('main')
      .get()

    const config = configSnap.exists ? configSnap.data() : null
    const stripeAccountId = config?.stripeAccountId

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
    console.error('Stripe status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Stripe status', message: error?.message || String(error) },
      { status: 500 }
    )
  }
}
