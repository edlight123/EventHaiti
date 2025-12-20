import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { calculateDiscount } from '@/lib/promo-codes'
import {
  createMonCashButtonCheckoutToken,
  getMonCashButtonRedirectUrl,
  isMonCashButtonConfigured,
} from '@/lib/moncash-button'

import crypto from 'crypto'

export const runtime = 'nodejs'

function buildTokenVariants(token: string): string[] {
  const raw = String(token || '').trim()
  if (!raw) return []

  const decoded = (() => {
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  })()

  const stripPadding = (v: string) => v.replace(/=+$/g, '')
  const toBase64 = (v: string) => v.replace(/-/g, '+').replace(/_/g, '/')
  const toBase64Url = (v: string) => v.replace(/\+/g, '-').replace(/\//g, '_')

  const candidates = [
    raw,
    decoded,
    stripPadding(raw),
    stripPadding(decoded),
    toBase64(raw),
    toBase64(decoded),
    stripPadding(toBase64(raw)),
    stripPadding(toBase64(decoded)),
    toBase64Url(raw),
    toBase64Url(decoded),
    stripPadding(toBase64Url(raw)),
    stripPadding(toBase64Url(decoded)),
  ]

  return Array.from(new Set(candidates.map((c) => c.trim()).filter(Boolean)))
}

type TierSelection = { tierId: string; quantity: number }

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isMonCashButtonConfigured()) {
      return NextResponse.json({ error: 'MonCash Button is not configured' }, { status: 500 })
    }

    const {
      eventId,
      quantity = 1,
      tierId,
      promoCode,
      tiers,
    }: {
      eventId: string
      quantity?: number
      tierId?: string | null
      promoCode?: string | null
      tiers?: TierSelection[]
    } = await request.json()

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Promo code (optional)
    let promo = null
    if (promoCode) {
      const { data } = await supabase.from('promo_codes').select('*').eq('id', promoCode).single()
      if (data) promo = data
    }

    // Normalize tier selections
    let normalizedSelections: { tierId: string | null; tierName: string; quantity: number; unitPrice: number }[] = []

    if (Array.isArray(tiers) && tiers.length > 0) {
      // Multi-tier selection
      for (const selection of tiers) {
        if (!selection?.tierId || !selection.quantity || selection.quantity <= 0) continue

        const { data: tier } = await supabase
          .from('ticket_tiers')
          .select('*')
          .eq('id', selection.tierId)
          .single()

        if (!tier) continue

        let unitPrice = tier.price
        if (promo) {
          const { discountedPrice } = calculateDiscount(unitPrice, promo)
          unitPrice = discountedPrice
        }

        normalizedSelections.push({
          tierId: selection.tierId,
          tierName: tier.name || 'Ticket',
          quantity: selection.quantity,
          unitPrice,
        })
      }

      if (normalizedSelections.length === 0) {
        return NextResponse.json({ error: 'No valid ticket tiers selected' }, { status: 400 })
      }
    } else {
      // Single-tier (or event base price)
      let unitPrice = event.ticket_price
      let tierName = 'General Admission'
      let resolvedTierId: string | null = null

      if (tierId) {
        const { data: tier } = await supabase
          .from('ticket_tiers')
          .select('*')
          .eq('id', tierId)
          .single()

        if (tier) {
          unitPrice = tier.price
          tierName = tier.name
          resolvedTierId = tier.id
        }
      }

      if (promo) {
        const { discountedPrice } = calculateDiscount(unitPrice, promo)
        unitPrice = discountedPrice
      }

      normalizedSelections = [
        {
          tierId: resolvedTierId,
          tierName,
          quantity,
          unitPrice,
        },
      ]
    }

    const totalQuantity = normalizedSelections.reduce((sum, s) => sum + s.quantity, 0)
    const totalAmount = normalizedSelections.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0)

    // Create a gateway order ID.
    // Keep it short to fit sandbox RSA encryption limits (Digicel sandbox keys can be tiny).
    // IMPORTANT: Digicel appears to expect a numeric orderId (parsing errors can happen otherwise).
    const orderId = `${Date.now() % 1_000_000_000}${String(crypto.randomInt(0, 1000)).padStart(3, '0')}`
    const internalOrderId = `mcbtn_${eventId}_${user.id}_${Date.now()}`

    // Store pending transaction first so we can fall back to an HTML form POST flow.
    const { error: pendingInsertError } = await supabase.from('pending_transactions').insert({
      transaction_id: null,
      order_id: orderId,
      internal_order_id: internalOrderId,
      user_id: user.id,
      event_id: eventId,
      quantity: totalQuantity,
      amount: totalAmount,
      payment_method: 'moncash_button',
      status: 'pending',
      currency: event.currency || 'HTG',
      tier_selections: normalizedSelections,
      promo_code_id: promoCode || null,
      moncash_button_token: null,
    })

    if (pendingInsertError) {
      console.error('Error creating pending transaction:', pendingInsertError)
      return NextResponse.json({ error: 'Failed to create pending transaction' }, { status: 500 })
    }

    const orderHash = crypto.createHash('sha256').update(orderId).digest('hex').slice(0, 10)
    const restTokenEnabled = String(process.env.MONCASH_BUTTON_REST_TOKEN_ENABLED || '').toLowerCase() === 'true'

    let redirectUrl: string
    if (restTokenEnabled) {
      try {
        const { token } = await createMonCashButtonCheckoutToken({
          amount: totalAmount,
          orderId,
        })

        console.info('[moncash_button] initiate: using REST token redirect', {
          orderHash,
          hasToken: Boolean(token),
        })

        const { error: pendingUpdateError } = await supabase
          .from('pending_transactions')
          .update({
            moncash_button_token: token,
            moncash_button_token_variants: buildTokenVariants(token),
          })
          .eq('order_id', orderId)

        if (pendingUpdateError) {
          console.error('Error updating pending transaction token:', pendingUpdateError)
        }

        redirectUrl = getMonCashButtonRedirectUrl(token)
      } catch (err: any) {
        console.warn('MonCash Button REST token failed; falling back to form POST:', {
          orderHash,
          message: err?.message,
        })
        console.info('[moncash_button] initiate: using FORM POST fallback', { orderHash })
        const origin = new URL(request.url).origin
        redirectUrl = `${origin}/api/moncash-button/checkout?orderId=${encodeURIComponent(orderId)}`
      }
    } else {
      console.info('[moncash_button] initiate: REST token disabled; using FORM POST fallback', { orderHash })
      const origin = new URL(request.url).origin
      redirectUrl = `${origin}/api/moncash-button/checkout?orderId=${encodeURIComponent(orderId)}`
    }

    const response = NextResponse.json({ redirectUrl })
    // Correlate browser redirect back from MonCash to our pending transaction.
    // This prevents false "missing_order" failures when the gateway doesn't include orderId
    // (or includes a token-like transactionId that can't be looked up).
    response.cookies.set('moncash_button_order_id', orderId, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      path: '/',
      maxAge: 60 * 60, // 1 hour
    })

    // Domain cookie helps when ReturnUrl host differs (www vs apex).
    const host = new URL(request.url).hostname
    const apex = host.startsWith('www.') ? host.slice(4) : host
    if (apex && apex.includes('.') && !/localhost/i.test(apex) && !/vercel\.app$/i.test(apex)) {
      response.cookies.set('moncash_button_order_id_domain', orderId, {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        path: '/',
        domain: `.${apex}`,
        maxAge: 60 * 60,
      })
    }
    return response
  } catch (error: any) {
    console.error('MonCash Button initiate error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initiate MonCash Button payment' },
      { status: 500 }
    )
  }
}
