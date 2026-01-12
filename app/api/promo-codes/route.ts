import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { adminDb } from '@/lib/firebase/admin'
import {
  getPromoExpiresAt,
  getPromoStartAt,
  getPromoUsesCount,
  isPromoActive,
  promoDiscountFields,
} from '@/lib/promo-code-shared'

/**
 * Create promo code for an event
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'organizer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { eventId, code, discountType, discountValue, maxUses, validFrom, validUntil } = await req.json()

    if (!eventId || !code || !discountType || discountValue === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseClient()

    // Verify event belongs to user (events are in Firebase)
    const eventDoc = await adminDb.collection('events').doc(eventId).get()
    
    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }
    
    const eventData = eventDoc.data()
    if (eventData?.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if code already exists for this event
    const { data: existingCodes, error: existingCodeError } = await supabase
      .from('promo_codes')
      .select('id')
      .eq('event_id', eventId)
      .eq('code', code.toUpperCase())
      .limit(1)

    if (existingCodeError) {
      console.warn('Error checking existing promo code:', existingCodeError)
    }

    if (existingCodes && existingCodes.length > 0) {
      return NextResponse.json(
        { error: 'Promo code already exists for this event' },
        { status: 400 }
      )
    }

    // Create promo code
    const promoId = `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const expiresAt = validUntil || null

    const promoData = {
      id: promoId,
      event_id: eventId,
      code: code.toUpperCase(),
      discount_type: discountType,
      discount_value: discountValue,
      max_uses: maxUses || null,
      // Canonical fields used by the organizer UI & mobile
      is_active: true,
      uses_count: 0,
      expires_at: expiresAt,
      // Legacy compatibility (some code paths still read these)
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      created_at: new Date().toISOString(),
    }

    console.log('Creating promo code with data:', promoData)

    const { error: insertError } = await supabase.from('promo_codes').insert(promoData)

    if (insertError) {
      console.error('Error creating promo code:', insertError)
      return NextResponse.json(
        { error: 'Failed to create promo code', details: insertError.message },
        { status: 500 }
      )
    }

    console.log('Promo code created successfully:', promoId)
    return NextResponse.json({ success: true, promoId })
  } catch (error) {
    console.error('Error in POST /api/promo-codes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Toggle promo code active state (organizer only)
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'organizer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { promoId, isActive } = await req.json()
    if (!promoId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createSupabaseClient()

    // Verify promo belongs to one of the organizer's events
    const { data: promo, error: promoError } = await supabase
      .from('promo_codes')
      .select('id,event_id')
      .eq('id', promoId)
      .single()

    if (promoError || !promo?.event_id) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 })
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('organizer_id')
      .eq('id', promo.event_id)
      .single()

    if (eventError || !event || event.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error: updateError } = await supabase
      .from('promo_codes')
      .update({ is_active: isActive })
      .eq('id', promoId)

    if (updateError) {
      console.error('Error updating promo code:', updateError)
      return NextResponse.json({ error: 'Failed to update promo code' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/promo-codes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Validate promo code
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')
    const code = searchParams.get('code')

    if (!eventId || !code) {
      return NextResponse.json(
        { error: 'Event ID and code are required' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseClient()

    const { data: promoCode, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('event_id', eventId)
      .eq('code', code.toUpperCase())
      .single()

    if (error || !promoCode) {
      return NextResponse.json(
        { valid: false, error: 'Invalid promo code' },
        { status: 404 }
      )
    }

    // Check if code is still valid
    const now = new Date()

    if (!isPromoActive(promoCode)) {
      return NextResponse.json(
        { valid: false, error: 'Promo code is inactive' },
        { status: 400 }
      )
    }
    
    const startAt = getPromoStartAt(promoCode)
    if (startAt && startAt > now) {
      return NextResponse.json(
        { valid: false, error: 'Promo code not yet valid' },
        { status: 400 }
      )
    }

    const expiresAt = getPromoExpiresAt(promoCode)
    if (expiresAt && expiresAt < now) {
      return NextResponse.json(
        { valid: false, error: 'Promo code has expired' },
        { status: 400 }
      )
    }

    const usesCount = getPromoUsesCount(promoCode)
    if (promoCode.max_uses && usesCount >= promoCode.max_uses) {
      return NextResponse.json(
        { valid: false, error: 'Promo code has reached maximum uses' },
        { status: 400 }
      )
    }

    const discount = promoDiscountFields(promoCode)

    return NextResponse.json({ 
      valid: true, 
      // Mobile client expects these legacy fields
      discount_percentage: discount.discount_percentage,
      discount_amount: discount.discount_amount,
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        discountType: discount.discountType,
        discountValue: discount.discountValue,
      }
    })
  } catch (error) {
    console.error('Error in GET /api/promo-codes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Delete promo code
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'organizer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const promoId = searchParams.get('promoId')

    if (!promoId) {
      return NextResponse.json(
        { error: 'Promo ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseClient()

    // Verify promo belongs to user's event
    const { data: promo } = await supabase
      .from('promo_codes')
      .select('*, events(organizer_id)')
      .eq('id', promoId)
      .single()

    if (!promo || promo.events?.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Promo code not found or unauthorized' },
        { status: 404 }
      )
    }

    // Delete promo code
    const { error: deleteError } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', promoId)

    if (deleteError) {
      console.error('Error deleting promo code:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete promo code' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/promo-codes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
