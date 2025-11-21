import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    console.log('=== CLAIM FREE TICKET ===')
    console.log('User:', user?.id, user?.email)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = await request.json()
    console.log('Event ID:', eventId)

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

    console.log('Event fetch result:', { event, error: eventError })

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Verify event is free
    console.log('Event ticket price:', event.ticket_price)
    if (event.ticket_price && event.ticket_price > 0) {
      return NextResponse.json({ error: 'This is not a free event' }, { status: 400 })
    }

    // Check if user already has a ticket for this event
    const { data: existingTicket } = await supabase
      .from('tickets')
      .select('id')
      .eq('event_id', eventId)
      .eq('attendee_id', user.id)
      .single()

    console.log('Existing ticket check:', existingTicket)

    if (existingTicket) {
      return NextResponse.json({ error: 'You already have a ticket for this event' }, { status: 400 })
    }

    // Check if tickets are still available
    const remainingTickets = (event.total_tickets || 0) - (event.tickets_sold || 0)
    console.log('Remaining tickets:', remainingTickets)
    if (remainingTickets <= 0) {
      return NextResponse.json({ error: 'No tickets available' }, { status: 400 })
    }

    // Generate QR code data
    const qrCodeData = `ticket-${eventId}-${user.id}-${Date.now()}`

    const ticketData = {
      event_id: eventId,
      attendee_id: user.id,
      status: 'valid',
      qr_code_data: qrCodeData,
      price_paid: 0,
      purchased_at: new Date().toISOString(),
    }
    
    console.log('Creating ticket with data:', ticketData)

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert(ticketData)
      .select()
      .single()

    console.log('Ticket creation result:', { ticket, error: ticketError })

    if (ticketError) {
      console.error('Ticket creation error:', ticketError)
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
    }

    // Update tickets_sold count
    const updateResult = await supabase
      .from('events')
      .update({ tickets_sold: (event.tickets_sold || 0) + 1 })
      .eq('id', eventId)
      
    console.log('Update tickets_sold result:', updateResult)

    console.log('=== SUCCESS ===')
    return NextResponse.json({ 
      success: true, 
      ticket: ticket,
      message: 'Free ticket claimed successfully!'
    })
  } catch (error: any) {
    console.error('Claim free ticket error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to claim free ticket' },
      { status: 500 }
    )
  }
}
