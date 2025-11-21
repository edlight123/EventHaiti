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

    const { eventId, quantity = 1 } = await request.json()
    console.log('Event ID:', eventId, 'Quantity:', quantity)

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    // Validate quantity
    const ticketQuantity = Math.min(Math.max(1, quantity), 10) // Max 10 tickets per claim
    console.log('Validated quantity:', ticketQuantity)

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

    // Check if tickets are still available
    const remainingTickets = (event.total_tickets || 0) - (event.tickets_sold || 0)
    console.log('Remaining tickets:', remainingTickets, 'Requested:', ticketQuantity)
    
    if (remainingTickets <= 0) {
      return NextResponse.json({ error: 'No tickets available' }, { status: 400 })
    }

    if (remainingTickets < ticketQuantity) {
      return NextResponse.json({ 
        error: `Only ${remainingTickets} ticket${remainingTickets !== 1 ? 's' : ''} remaining` 
      }, { status: 400 })
    }

    // Create multiple tickets
    const ticketsToCreate = []
    for (let i = 0; i < ticketQuantity; i++) {
      const qrCodeData = `ticket-${eventId}-${user.id}-${Date.now()}-${i}`
      ticketsToCreate.push({
        event_id: eventId,
        attendee_id: user.id,
        status: 'valid',
        qr_code_data: qrCodeData,
        price_paid: 0,
        purchased_at: new Date().toISOString(),
      })
    }
    
    console.log('Creating tickets:', ticketsToCreate.length)

    // Create tickets
    const { data: tickets, error: ticketError } = await supabase
      .from('tickets')
      .insert(ticketsToCreate)
      .select()

    console.log('Ticket creation result:', { count: tickets?.length, error: ticketError })

    if (ticketError) {
      console.error('Ticket creation error:', ticketError)
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
    }

    // Update tickets_sold count
    const updateResult = await supabase
      .from('events')
      .update({ tickets_sold: (event.tickets_sold || 0) + ticketQuantity })
      .eq('id', eventId)
      
    console.log('Update tickets_sold result:', updateResult)

    console.log('=== SUCCESS ===')
    return NextResponse.json({ 
      success: true, 
      tickets: tickets,
      count: ticketQuantity,
      message: `${ticketQuantity} free ticket${ticketQuantity !== 1 ? 's' : ''} claimed successfully!`
    })
  } catch (error: any) {
    console.error('Claim free ticket error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to claim free ticket' },
      { status: 500 }
    )
  }
}
