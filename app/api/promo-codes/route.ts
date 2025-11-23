import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/firebase-db/server'

/**
 * Create promo code for an event
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId, code, discountType, discountValue, maxUses, validFrom, validUntil } = await req.json()

    if (!eventId || !code || !discountType || discountValue === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify event belongs to user
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('organizer_id')
      .eq('id', eventId)
      .single()

    if (eventError || !event || event.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Event not found or unauthorized' },
        { status: 404 }
      )
    }

    // Check if code already exists for this event
    const { data: existingCode } = await supabase
      .from('promo_codes')
      .select('id')
      .eq('event_id', eventId)
      .eq('code', code.toUpperCase())
      .single()

    if (existingCode) {
      return NextResponse.json(
        { error: 'Promo code already exists for this event' },
        { status: 400 }
      )
    }

    // Create promo code
    const promoId = `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const { error: insertError } = await supabase.from('promo_codes').insert({
      id: promoId,
      event_id: eventId,
      code: code.toUpperCase(),
      discount_type: discountType,
      discount_value: discountValue,
      max_uses: maxUses || null,
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('Error creating promo code:', insertError)
      return NextResponse.json(
        { error: 'Failed to create promo code' },
        { status: 500 }
      )
    }

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

    const supabase = await createClient()

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
    
    if (promoCode.valid_from && new Date(promoCode.valid_from) > now) {
      return NextResponse.json(
        { valid: false, error: 'Promo code not yet valid' },
        { status: 400 }
      )
    }

    if (promoCode.valid_until && new Date(promoCode.valid_until) < now) {
      return NextResponse.json(
        { valid: false, error: 'Promo code has expired' },
        { status: 400 }
      )
    }

    if (promoCode.max_uses && promoCode.times_used >= promoCode.max_uses) {
      return NextResponse.json(
        { valid: false, error: 'Promo code has reached maximum uses' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      valid: true, 
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        discountType: promoCode.discount_type,
        discountValue: promoCode.discount_value,
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

    const { searchParams } = new URL(req.url)
    const promoId = searchParams.get('promoId')

    if (!promoId) {
      return NextResponse.json(
        { error: 'Promo ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

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
