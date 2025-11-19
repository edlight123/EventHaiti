import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ticketId, reason } = await request.json()

    if (!ticketId || !reason) {
      return Response.json({ error: 'Ticket ID and reason are required' }, { status: 400 })
    }

    // Fetch the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*, events(*)')
      .eq('id', ticketId)
      .eq('attendee_id', user.id)
      .single()

    if (ticketError || !ticket) {
      return Response.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check if ticket is already refunded or cancelled
    if (ticket.refund_status !== 'none' && ticket.refund_status !== null) {
      return Response.json({ error: 'Refund already requested or processed' }, { status: 400 })
    }

    // Check if event has already occurred
    const event = ticket.events
    if (new Date(event.start_datetime) < new Date()) {
      return Response.json({ error: 'Cannot refund tickets for past events' }, { status: 400 })
    }

    // Check refund deadline (e.g., 24 hours before event)
    const refundDeadline = new Date(event.start_datetime)
    refundDeadline.setHours(refundDeadline.getHours() - 24)
    
    if (new Date() > refundDeadline) {
      return Response.json({ 
        error: 'Refund deadline has passed. Refunds must be requested at least 24 hours before the event.' 
      }, { status: 400 })
    }

    // Update ticket with refund request
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        refund_status: 'requested',
        refund_reason: reason,
        refund_requested_at: new Date().toISOString()
      })
      .eq('id', ticketId)

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return Response.json({ error: 'Failed to request refund' }, { status: 500 })
    }

    // TODO: Notify organizer about refund request
    
    return Response.json({ 
      success: true, 
      message: 'Refund request submitted. The organizer will review your request.' 
    })
  } catch (error) {
    console.error('Refund request error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
