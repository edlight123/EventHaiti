import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { notifyTicketPurchase, notifyOrganizerTicketSale } from '@/lib/notifications/helpers'

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

    // Create tickets one at a time to ensure each gets a unique ID
    const createdTickets = []
    for (let i = 0; i < ticketQuantity; i++) {
      const qrCodeData = `ticket-${eventId}-${user.id}-${Date.now()}-${i}`
      const ticketData = {
        event_id: eventId,
        attendee_id: user.id,
        status: 'valid',
        qr_code_data: qrCodeData,
        price_paid: 0,
        purchased_at: new Date().toISOString(),
      }
      
      const insertResult = await supabase
        .from('tickets')
        .insert([ticketData])
        .select()
      
      if (insertResult.error) {
        console.error('Ticket creation error:', insertResult.error)
        return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
      }
      
      const createdTicket = insertResult.data?.[0]
      if (createdTicket) {
        createdTickets.push(createdTicket)
        console.log('Created ticket:', createdTicket.id, 'with QR:', qrCodeData)
      }
    }
    
    console.log('Created tickets:', createdTickets.length)

    // Update tickets_sold count
    const updateResult = await supabase
      .from('events')
      .update({ tickets_sold: (event.tickets_sold || 0) + ticketQuantity })
      .eq('id', eventId)
      
    console.log('Update tickets_sold result:', updateResult)

    // Send in-app notification for free ticket claim
    try {
      await notifyTicketPurchase(
        user.id,
        eventId,
        event.title,
        ticketQuantity
      )
      
      // Notify organizer
      await notifyOrganizerTicketSale(
        event.organizer_id,
        eventId,
        event.title,
        ticketQuantity,
        0, // free event
        user.full_name
      )
    } catch (error) {
      console.error('Failed to send notification:', error)
      // Don't fail the claim if notification fails
    }

    console.log('=== SUCCESS ===')
    return NextResponse.json({ 
      success: true, 
      tickets: createdTickets,
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
