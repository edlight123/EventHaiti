import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { getPromoExpiresAt, getPromoStartAt, getPromoUsesCount, isPromoActive } from '@/lib/promo-code-shared'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code, eventId } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Find promo code
    const { data: promoCode, error: promoError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (promoError || !promoCode) {
      return NextResponse.json({ error: 'Invalid promo code' }, { status: 404 })
    }

    // Check if event-specific
    if (promoCode.event_id && promoCode.event_id !== eventId) {
      return NextResponse.json({ error: 'This promo code is not valid for this event' }, { status: 400 })
    }

    // Check validity period
    const now = new Date()

    if (!isPromoActive(promoCode)) {
      return NextResponse.json({ error: 'This promo code is inactive' }, { status: 400 })
    }

    const startAt = getPromoStartAt(promoCode)
    if (startAt && startAt > now) {
      return NextResponse.json({ error: 'This promo code is not yet valid' }, { status: 400 })
    }

    const expiresAt = getPromoExpiresAt(promoCode)
    if (expiresAt && expiresAt < now) {
      return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 })
    }

    // Check max uses
    const usesCount = getPromoUsesCount(promoCode)
    if (promoCode.max_uses && usesCount >= promoCode.max_uses) {
      return NextResponse.json({ error: 'This promo code has reached its usage limit' }, { status: 400 })
    }

    // Check max uses per user
    const { data: userUsages } = await supabase
      .from('promo_code_usage')
      .select('*')
      .eq('promo_code_id', promoCode.id)
      .eq('user_id', user.id)

    const userUsageCount = userUsages?.length || 0

    if (userUsageCount && userUsageCount >= promoCode.max_uses_per_user) {
      return NextResponse.json({ 
        error: `You have already used this promo code ${promoCode.max_uses_per_user} time(s)` 
      }, { status: 400 })
    }

    // Return valid promo code with discount info
    return NextResponse.json({
      valid: true,
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        description: promoCode.description,
        discountType: promoCode.discount_type,
        discountValue: promoCode.discount_value,
      },
    })
  } catch (error: any) {
    console.error('Promo code validation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to validate promo code' },
      { status: 500 }
    )
  }
}
