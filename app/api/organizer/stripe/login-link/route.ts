import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY)
}

export async function POST(_request: NextRequest) {
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
      return NextResponse.json({ error: 'Stripe account not connected' }, { status: 400 })
    }

    const stripe = getStripe()
    const link = await stripe.accounts.createLoginLink(stripeAccountId)

    return NextResponse.json({ url: link.url })
  } catch (error: any) {
    console.error('Stripe login link error:', error)
    return NextResponse.json(
      { error: 'Failed to create Stripe login link', message: error?.message || String(error) },
      { status: 500 }
    )
  }
}
