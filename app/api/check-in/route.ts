import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ticketId, eventId } = await request.json()

    if (!ticketId || !eventId) {
      return NextResponse.json(
        { error: 'Missing ticketId or eventId' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get all tickets and find by QR code
    const { data: allTickets } = await supabase
      .from('tickets')
      .select('*')
      .execute()

    const ticket = allTickets?.find(t => t.qr_code_data === ticketId)

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Verify ticket belongs to this event
    if (ticket.event_id !== eventId) {
      return NextResponse.json(
        { error: 'Ticket does not belong to this event' },
        { status: 400 }
      )
    }

    // Get event to verify organizer
    const { data: allEvents } = await supabase
      .from('events')
      .select('*')
      .execute()

    const event = allEvents?.find(e => e.id === eventId)

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Verify user is the organizer
    if (event.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the event organizer can check in attendees' },
        { status: 403 }
      )
    }

    // Check if already checked in
    if (ticket.checked_in_at) {
      return NextResponse.json(
        { 
          error: `Already checked in at ${new Date(ticket.checked_in_at).toLocaleString()}`,
          attendee: ticket.attendee_name || 'Unknown'
        },
        { status: 400 }
      )
    }

    // Get attendee info
    const { data: allUsers } = await supabase
      .from('users')
      .select('*')
      .execute()

    const attendee = allUsers?.find(u => u.id === ticket.attendee_id)

    // Update ticket with check-in time
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ checked_in_at: new Date().toISOString() })
      .match({ id: ticket.id })
      .execute()

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return NextResponse.json(
        { error: 'Failed to check in ticket' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      attendee: attendee?.name || attendee?.email || 'Unknown',
      ticket: {
        id: ticket.id,
        status: ticket.status,
        checked_in_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
