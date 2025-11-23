import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { sendEmail, getTicketConfirmationEmail } from '@/lib/email'
import { generateTicketQRCode } from '@/lib/qrcode'
import { calculateDiscount } from '@/lib/promo-codes'
import { 
  isBlacklisted, 
  shouldRateLimit, 
  checkTicketLimit, 
  logPurchaseAttempt,
  detectBotBehavior,
  logSuspiciousActivity 
} from '@/lib/security'

// Lazy load Stripe to avoid build-time initialization
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY)
}

export async function POST(request: Request) {
  try {
    const stripe = getStripe()
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId, quantity = 1, promoCodeId, fingerprint } = await request.json()

    // Get IP address
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    // Security checks
    // 1. Check if user is blacklisted
    const userBlacklist = await isBlacklisted(user.id, 'user')
    if (userBlacklist.blacklisted) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ 
        error: `Account suspended: ${userBlacklist.reason}` 
      }, { status: 403 })
    }

    // 2. Check if email is blacklisted
    const emailBlacklist = await isBlacklisted(user.email, 'email')
    if (emailBlacklist.blacklisted) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ 
        error: 'Unable to process purchase. Please contact support.' 
      }, { status: 403 })
    }

    // 3. Check if IP is blacklisted
    const ipBlacklist = await isBlacklisted(ipAddress, 'ip')
    if (ipBlacklist.blacklisted) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ 
        error: 'Unable to process purchase from this network.' 
      }, { status: 403 })
    }

    // 4. Check rate limiting
    const rateLimit = await shouldRateLimit(user.id, ipAddress, eventId)
    if (rateLimit.limited) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ 
        error: rateLimit.reason 
      }, { status: 429 })
    }

    // 5. Detect bot behavior
    const isBot = await detectBotBehavior(user.id, ipAddress, fingerprint)
    if (isBot) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ 
        error: 'Automated purchase attempts are not allowed.' 
      }, { status: 403 })
    }

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // 6. Check per-event ticket limit
    const ticketLimit = await checkTicketLimit(user.id, eventId)
    if (ticketLimit.exceeded) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      await logSuspiciousActivity({
        userId: user.id,
        activityType: 'rapid_purchases',
        description: `User attempted to purchase beyond limit: ${ticketLimit.currentCount}/${ticketLimit.maxAllowed}`,
        severity: 'medium',
        ipAddress,
        metadata: { eventId, attemptedQuantity: quantity, ...ticketLimit },
      })
      return NextResponse.json({ 
        error: `You already have ${ticketLimit.currentCount} ticket(s) for this event. Maximum allowed: ${ticketLimit.maxAllowed}` 
      }, { status: 400 })
    }

    // Check if adding this quantity would exceed limit
    if (ticketLimit.currentCount! + quantity > ticketLimit.maxAllowed!) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      const remaining = ticketLimit.maxAllowed! - ticketLimit.currentCount!
      return NextResponse.json({ 
        error: `You can only purchase ${remaining} more ticket(s) for this event (limit: ${ticketLimit.maxAllowed})` 
      }, { status: 400 })
    }

    let finalPrice = event.ticket_price
    let promoCode = null

    // Apply promo code if provided
    if (promoCodeId) {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('id', promoCodeId)
        .single()

      if (!error && data) {
        promoCode = data
        const { discountedPrice } = calculateDiscount(event.ticket_price, promoCode)
        finalPrice = discountedPrice
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: event.currency?.toLowerCase() || 'usd',
            product_data: {
              name: event.title,
              description: event.description?.substring(0, 200),
              images: event.banner_image_url ? [event.banner_image_url] : [],
            },
            unit_amount: Math.round(finalPrice * 100), // Convert to cents
          },
          quantity,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/${eventId}`,
      client_reference_id: user.id,
      metadata: {
        eventId,
        userId: user.id,
        quantity: quantity.toString(),
        promoCodeId: promoCodeId || '',
        originalPrice: event.ticket_price.toString(),
      },
    })

    // Log successful purchase attempt
    await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, true)

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    
    // Log failed purchase attempt (if we have the necessary data)
    try {
      const body = await error.request?.json?.() || {}
      const ipAddress = error.request?.headers?.get('x-forwarded-for') || 'unknown'
      if (body.eventId && body.userId) {
        await logPurchaseAttempt(
          { 
            userId: body.userId, 
            eventId: body.eventId, 
            ipAddress, 
            quantity: body.quantity || 1,
            fingerprint: body.fingerprint 
          }, 
          false
        )
      }
    } catch (logError) {
      // Ignore logging errors
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
