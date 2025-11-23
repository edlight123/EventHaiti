import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/firebase-db/server'

/**
 * Create ticket tier for an event
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId, name, description, price, quantity, salesStart, salesEnd, sortOrder } = await req.json()

    if (!eventId || !name || price === undefined || quantity === undefined) {
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

    // Create ticket tier
    const tierId = `tier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Convert price from cents to dollars for DECIMAL storage
    const priceInDollars = price / 100

    const tierData = {
      id: tierId,
      event_id: eventId,
      name,
      description,
      price: priceInDollars,
      total_quantity: quantity,
      sold_quantity: 0,
      sales_start: salesStart || null,
      sales_end: salesEnd || null,
      sort_order: sortOrder || 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log('Creating ticket tier:', tierData)

    const { error: insertError } = await supabase.from('ticket_tiers').insert(tierData)

    if (insertError) {
      console.error('Error creating ticket tier:', insertError)
      return NextResponse.json(
        { error: 'Failed to create ticket tier' },
        { status: 500 }
      )
    }

    console.log('Ticket tier created successfully:', tierId)
    return NextResponse.json({ success: true, tierId })
  } catch (error) {
    console.error('Error in POST /api/ticket-tiers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get ticket tiers for an event
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    console.log('Fetching ticket tiers for eventId:', eventId)

    const { data: tiers, error } = await supabase
      .from('ticket_tiers')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching ticket tiers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch ticket tiers' },
        { status: 500 }
      )
    }

    console.log('Found tiers:', tiers?.length || 0, tiers)
    return NextResponse.json({ tiers })
  } catch (error) {
    console.error('Error in GET /api/ticket-tiers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Update or delete ticket tier
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tierId, name, description, price, quantity, salesStart, salesEnd, sortOrder } = await req.json()

    if (!tierId) {
      return NextResponse.json(
        { error: 'Tier ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify tier belongs to user's event
    const { data: tier } = await supabase
      .from('ticket_tiers')
      .select('*, events(organizer_id)')
      .eq('id', tierId)
      .single()

    if (!tier || tier.events?.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Ticket tier not found or unauthorized' },
        { status: 404 }
      )
    }

    // Update tier
    const priceInDollars = price !== undefined ? price / 100 : tier.price
    
    const { error: updateError } = await supabase
      .from('ticket_tiers')
      .update({
        name: name !== undefined ? name : tier.name,
        description: description !== undefined ? description : tier.description,
        price: priceInDollars,
        total_quantity: quantity !== undefined ? quantity : tier.total_quantity,
        sales_start: salesStart !== undefined ? salesStart : tier.sales_start,
        sales_end: salesEnd !== undefined ? salesEnd : tier.sales_end,
        sort_order: sortOrder !== undefined ? sortOrder : tier.sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tierId)

    if (updateError) {
      console.error('Error updating ticket tier:', updateError)
      return NextResponse.json(
        { error: 'Failed to update ticket tier' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/ticket-tiers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Delete ticket tier
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const tierId = searchParams.get('tierId')

    if (!tierId) {
      return NextResponse.json(
        { error: 'Tier ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify tier belongs to user's event
    const { data: tier } = await supabase
      .from('ticket_tiers')
      .select('*, events(organizer_id)')
      .eq('id', tierId)
      .single()

    if (!tier || tier.events?.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Ticket tier not found or unauthorized' },
        { status: 404 }
      )
    }

    // Delete tier
    const { error: deleteError } = await supabase
      .from('ticket_tiers')
      .delete()
      .eq('id', tierId)

    if (deleteError) {
      console.error('Error deleting ticket tier:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete ticket tier' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/ticket-tiers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
