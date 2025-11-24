// API Route: POST /api/tickets/transfer/respond
// Accept or reject a ticket transfer

import { createClient } from '@/lib/firebase-db/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const transferResponseSchema = z.object({
  transferToken: z.string(),
  action: z.enum(['accept', 'reject'])
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate request body
    const body = await request.json()
    const validation = transferResponseSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { transferToken, action } = validation.data

    // Get transfer details
    const { data: transfer, error: transferError } = await supabase
      .from('ticket_transfers')
      .select(`
        *,
        tickets(
          id,
          attendee_id,
          status,
          checked_in,
          transfer_count,
          events(
            id,
            title,
            start_datetime
          )
        )
      `)
      .eq('transfer_token', transferToken)
      .single()

    if (transferError || !transfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      )
    }

    // Verify recipient
    if (transfer.to_email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'This transfer is not for you' },
        { status: 403 }
      )
    }

    // Check transfer status
    if (transfer.status !== 'pending') {
      return NextResponse.json(
        { error: `Transfer is ${transfer.status}` },
        { status: 400 }
      )
    }

    // Check expiration
    if (new Date(transfer.expires_at) < new Date()) {
      await supabase
        .from('ticket_transfers')
        .update({ status: 'expired' })
        .eq('id', transfer.id)

      return NextResponse.json(
        { error: 'Transfer has expired' },
        { status: 400 }
      )
    }

    // Check ticket is still valid
    if ((transfer.tickets.status !== 'active' && transfer.tickets.status !== 'valid') || transfer.tickets.checked_in) {
      return NextResponse.json(
        { error: 'Ticket is no longer available for transfer' },
        { status: 400 }
      )
    }

    if (action === 'reject') {
      // Reject transfer
      const { error: updateError } = await supabase
        .from('ticket_transfers')
        .update({ 
          status: 'rejected',
          to_user_id: user.id
        })
        .eq('id', transfer.id)

      if (updateError) {
        console.error('Transfer rejection error:', updateError)
        return NextResponse.json(
          { error: 'Failed to reject transfer' },
          { status: 500 }
        )
      }

      // Notify original owner
      try {
        const { sendEmail, getTicketTransferResponseEmail } = await import('@/lib/email')
        const { data: originalOwner } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', transfer.from_user_id)
          .single()

        if (originalOwner?.email) {
          await sendEmail({
            to: originalOwner.email,
            subject: `Ticket transferred successfully - ${transfer.tickets.events.title}`,
            html: getTicketTransferResponseEmail({
              recipientName: user.user_metadata?.full_name || transfer.to_email,
              eventTitle: transfer.tickets.events.title,
              action: 'rejected',
              ticketId: transfer.ticket_id
            })
          })
        }
      } catch (emailError) {
        console.error('Failed to send rejection notification:', emailError)
      }

      return NextResponse.json({
        success: true,
        status: 'rejected'
      })
    }

    // Accept transfer - update ticket ownership
    const { error: ticketUpdateError } = await supabase
      .from('tickets')
      .update({ 
        attendee_id: user.id,
        user_id: user.id,
        transfer_count: (transfer.tickets.transfer_count || 0) + 1
      })
      .eq('id', transfer.ticket_id)

    if (ticketUpdateError) {
      console.error('Ticket update error:', ticketUpdateError)
      return NextResponse.json(
        { error: 'Failed to transfer ticket ownership' },
        { status: 500 }
      )
    }

    // Update transfer status
    const { error: transferUpdateError } = await supabase
      .from('ticket_transfers')
      .update({ 
        status: 'accepted',
        to_user_id: user.id,
        accepted_at: new Date().toISOString()
      })
      .eq('id', transfer.id)

    if (transferUpdateError) {
      console.error('Transfer status update error:', transferUpdateError)
      // Note: ticket ownership was already transferred
    }

    // Send notifications
    try {
      const { sendEmail, getTicketTransferResponseEmail, getTicketConfirmationEmail } = await import('@/lib/email')
      
      // Notify original owner
      const { data: originalOwner } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', transfer.from_user_id)
        .single()

      if (originalOwner?.email) {
        await sendEmail({
          to: originalOwner.email,
          subject: `Ticket transferred successfully - ${transfer.tickets.events.title}`,
          html: getTicketTransferResponseEmail({
            recipientName: user.user_metadata?.full_name || transfer.to_email,
            eventTitle: transfer.tickets.events.title,
            action: 'accepted',
            ticketId: transfer.ticket_id
          })
        })
      }

      // Send new ticket confirmation to recipient
      const { data: ticket } = await supabase
        .from('tickets')
        .select('*, events(*)')
        .eq('id', transfer.ticket_id)
        .single()

      if (ticket) {
        await sendEmail({
          to: user.email!,
          subject: `Your ticket for ${ticket.events.title}`,
          html: getTicketConfirmationEmail({
            attendeeName: user.user_metadata?.full_name || 'Attendee',
            eventTitle: ticket.events.title,
            eventDate: ticket.events.start_datetime,
            eventVenue: ticket.events.location,
            ticketId: ticket.id,
            qrCodeDataURL: ticket.qr_code
          })
        })
      }
    } catch (emailError) {
      console.error('Failed to send transfer notifications:', emailError)
    }

    return NextResponse.json({
      success: true,
      status: 'accepted',
      ticketId: transfer.ticket_id
    })

  } catch (error) {
    console.error('Transfer response error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
