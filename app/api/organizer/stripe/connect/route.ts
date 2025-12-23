import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Lazy load
  return require('stripe')(process.env.STRIPE_SECRET_KEY)
}

function normalizeAppUrl(request: NextRequest) {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
  if (fromEnv) return fromEnv

  const first = (value: string | null) => String(value || '').split(',')[0].trim()

  // Prefer the actual request host (works well with domain aliases).
  const host =
    first(request.headers.get('host')) ||
    first(request.headers.get('x-forwarded-host')) ||
    request.nextUrl.host ||
    first(process.env.VERCEL_URL || null)

  // Prefer forwarded proto, otherwise infer.
  const inferredProto = request.nextUrl.protocol ? request.nextUrl.protocol.replace(':', '') : ''
  const proto =
    first(request.headers.get('x-forwarded-proto')) ||
    inferredProto ||
    (process.env.VERCEL_ENV === 'production' ? 'https' : 'http')

  if (host) return `${proto}://${host}`

  return request.nextUrl.origin || 'http://localhost:3000'
}

function toStripeCountry(accountLocation: string): 'US' | 'CA' {
  const loc = String(accountLocation || '').toLowerCase()
  if (loc === 'canada' || loc === 'ca') return 'CA'
  return 'US'
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const organizerId = decodedClaims.uid

    const body = await request.json().catch(() => ({}))
    const requestedLocation = String(body?.accountLocation || '').toLowerCase()

    // Read payout config (source of truth)
    const configRef = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payoutConfig')
      .doc('main')

    const configSnap = await configRef.get()
    const config = configSnap.exists ? configSnap.data() : null

    const accountLocation =
      requestedLocation ||
      String(config?.accountLocation || config?.bankDetails?.accountLocation || '').toLowerCase()

    if (!accountLocation || (accountLocation !== 'united_states' && accountLocation !== 'canada')) {
      return NextResponse.json(
        { error: 'Stripe Connect is only available for United States or Canada accounts.' },
        { status: 400 }
      )
    }

    const stripe = getStripe()

    // Get organizer email
    const userDoc = await adminDb.collection('users').doc(organizerId).get()
    const email = userDoc.exists ? (userDoc.data()?.email as string | undefined) : undefined

    const stripeCountry = toStripeCountry(accountLocation)

    let stripeAccountId = config?.stripeAccountId || null

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: stripeCountry,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          organizerId,
        },
      })

      stripeAccountId = account.id

      await configRef.set(
        {
          payoutProvider: 'stripe_connect',
          method: 'bank_transfer',
          accountLocation,
          stripeAccountId,
          updatedAt: new Date().toISOString(),
          createdAt: config?.createdAt || new Date().toISOString(),
        },
        { merge: true }
      )
    }

    const appUrl = normalizeAppUrl(request)
    const refreshUrl = `${appUrl}/organizer/settings/payouts?stripe=refresh`
    const returnUrl = `${appUrl}/organizer/settings/payouts?stripe=return`

    const link = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })

    return NextResponse.json({
      url: link.url,
      stripeAccountId,
    })
  } catch (error: any) {
    const statusCode = Number(error?.statusCode) || Number(error?.raw?.statusCode) || 500

    // Common misconfiguration: Stripe account not enabled for Connect
    const rawMessage =
      String(error?.raw?.message || error?.message || 'Failed to create Stripe onboarding link')

    const connectNotEnabled =
      rawMessage.includes("signed up for Connect") ||
      rawMessage.includes('sign up for Connect') ||
      rawMessage.includes('signed up for connect')

    const userMessage = connectNotEnabled
      ? 'Stripe Connect is not enabled on this Stripe account. In Stripe Dashboard → Settings → Connect, enable Connect for this account (Test mode and/or Live mode), then retry.'
      : rawMessage

    console.error('Stripe connect error:', error)

    return NextResponse.json(
      {
        error: 'Failed to create Stripe onboarding link',
        message: userMessage,
        stripe: {
          requestId: error?.requestId || error?.raw?.requestId,
          type: error?.type || error?.rawType,
        },
      },
      { status: statusCode }
    )
  }
}
