import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { calculateDiscount } from '@/lib/promo-codes'
import { 
  isBlacklisted, 
  shouldRateLimit, 
  checkTicketLimit, 
  logPurchaseAttempt,
  detectBotBehavior,
  logSuspiciousActivity 
} from '@/lib/security'

// Lazy load Stripe
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

    const { eventId, quantity = 1, tierId, promoCodeId, fingerprint } = await request.json()

    // Get IP address
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    // Security checks (same as checkout session)
    const userBlacklist = await isBlacklisted(user.id, 'user')
    if (userBlacklist.blacklisted) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ 
        error: `Account suspended: ${userBlacklist.reason}` 
      }, { status: 403 })
    }

    const emailBlacklist = await isBlacklisted(user.email, 'email')
    if (emailBlacklist.blacklisted) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ 
        error: 'Unable to process purchase. Please contact support.' 
      }, { status: 403 })
    }

    const ipBlacklist = await isBlacklisted(ipAddress, 'ip')
    if (ipBlacklist.blacklisted) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ 
        error: 'Unable to process purchase from this network.' 
      }, { status: 403 })
    }

    const rateLimit = await shouldRateLimit(user.id, ipAddress, eventId)
    if (rateLimit.limited) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ 
        error: rateLimit.reason 
      }, { status: 429 })
    }

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

    // Check ticket limit
    const ticketLimit = await checkTicketLimit(user.id, eventId)
    if (ticketLimit.exceeded) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ 
        error: `You already have ${ticketLimit.currentCount} ticket(s) for this event. Maximum allowed: ${ticketLimit.maxAllowed}` 
      }, { status: 400 })
    }

    if (ticketLimit.currentCount! + quantity > ticketLimit.maxAllowed!) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      const remaining = ticketLimit.maxAllowed! - ticketLimit.currentCount!
      return NextResponse.json({ 
        error: `You can only purchase ${remaining} more ticket(s) for this event (limit: ${ticketLimit.maxAllowed})` 
      }, { status: 400 })
    }

    // Get tier price if specified
    let finalPrice = event.ticket_price
    let tierName = 'General Admission'

    if (tierId) {
      const { data: tier } = await supabase
        .from('ticket_tiers')
        .select('*')
        .eq('id', tierId)
        .single()

      if (tier) {
        finalPrice = tier.price
        tierName = tier.name
      }
    }

    // Apply promo code if provided
    let promoCode = null
    if (promoCodeId) {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('id', promoCodeId)
        .single()

      if (!error && data) {
        promoCode = data
        const { discountedPrice } = calculateDiscount(finalPrice, promoCode)
        finalPrice = discountedPrice
      }
    }

    // Handle currency conversion for Stripe
    const eventCurrency = (event.currency?.toUpperCase() || 'USD') as 'USD' | 'HTG'
    let stripeAmount = finalPrice
    let stripeCurrency = eventCurrency.toLowerCase()
    let exchangeRateUsed: number | null = null
    let originalCurrency = eventCurrency
    
    // Convert HTG to USD for Stripe if needed (Stripe doesn't support HTG directly)
    if (eventCurrency === 'HTG') {
      const { fetchStripeHTGRate } = await import('@/lib/currency')
      // Fetch live exchange rate from Stripe
      exchangeRateUsed = await fetchStripeHTGRate()
      stripeAmount = finalPrice * exchangeRateUsed
      stripeCurrency = 'usd'
      console.log(`💱 Converting ${finalPrice} HTG to ${stripeAmount.toFixed(2)} USD (Stripe rate: ${exchangeRateUsed})`)
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(stripeAmount * quantity * 100), // Convert to cents
      currency: stripeCurrency,
      metadata: {
        eventId,
        userId: user.id,
        eventTitle: event.title,
        quantity: quantity.toString(),
        tierId: tierId || '',
        tierName,
        promoCodeId: promoCodeId || '',
        originalPrice: event.ticket_price.toString(),
        finalPrice: finalPrice.toString(),
        currency: stripeCurrency,
        originalCurrency: originalCurrency,
        exchangeRate: exchangeRateUsed?.toString() || '',
        priceInOriginalCurrency: finalPrice.toString(),
      },
      description: `${quantity}x ${event.title} - ${tierName}`,
      receipt_email: user.email,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    // Log successful attempt
    await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, true)

    return NextResponse.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    })
  } catch (error: any) {
    console.error('Payment Intent creation error:', error)
    
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
