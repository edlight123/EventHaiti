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

    const { token } = await createMonCashButtonCheckoutToken({
      amount: totalAmount,
      orderId,
    })

    const redirectUrl = getMonCashButtonRedirectUrl(token)

    // Store pending transaction (keyed by order_id for Button flow)
    await supabase.from('pending_transactions').insert({
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
      moncash_button_token: token,
    })

    const res = NextResponse.json({ redirectUrl })

    // Cookie helps the return handler map browser redirect back to the order.
    // If you configure the MonCash portal Return URL to include ?orderId=... you can remove this.
    res.cookies.set('moncash_button_order_id', orderId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 30, // 30 minutes
    })

    return res
  } catch (error: any) {
    console.error('MonCash Button initiate error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initiate MonCash Button payment' },
      { status: 500 }
    )
  }
}
