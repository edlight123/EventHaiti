import { createClient } from '@/lib/supabase/server'
import { processStripeRefund } from '@/lib/refunds'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ticketId, action } = await request.json()

    if (!ticketId || !action || !['approve', 'deny'].includes(action)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Fetch the ticket with event details
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*, events(*)')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return Response.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Verify user is the organizer
    if (ticket.events.organizer_id !== user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if refund was requested
    if (ticket.refund_status !== 'requested') {
      return Response.json({ error: 'No pending refund request for this ticket' }, { status: 400 })
    }

    if (action === 'deny') {
      // Deny refund
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          refund_status: 'denied',
          refund_processed_at: new Date().toISOString()
        })
        .eq('id', ticketId)

      if (updateError) {
        return Response.json({ error: 'Failed to deny refund' }, { status: 500 })
      }

      return Response.json({ success: true, message: 'Refund request denied' })
    }

    // Approve refund - process payment refund
    let refundAmount = ticket.price

    if (ticket.payment_method === 'stripe' && ticket.payment_intent_id) {
      const stripeRefund = await processStripeRefund(ticket.payment_intent_id, refundAmount)
      
      if (!stripeRefund.success) {
        return Response.json({ error: stripeRefund.error }, { status: 500 })
      }
    } else if (ticket.payment_method === 'moncash' && ticket.transaction_id) {
      // MonCash refunds typically need manual processing
      // Update the ticket status and notify organizer to process manually
      refundAmount = ticket.price
    }

    // Update ticket status
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'refunded',
        refund_status: 'approved',
        refund_amount: refundAmount,
        refund_processed_at: new Date().toISOString()
      })
      .eq('id', ticketId)

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return Response.json({ error: 'Failed to process refund' }, { status: 500 })
    }

    // TODO: Send confirmation email to attendee

    return Response.json({ 
      success: true, 
      message: 'Refund processed successfully',
      refundAmount 
    })
  } catch (error) {
    console.error('Refund processing error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
