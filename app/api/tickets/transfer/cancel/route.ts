// API Route: POST /api/tickets/transfer/cancel
// Cancel a pending ticket transfer

import { createClient } from '@/lib/firebase-db/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const cancelSchema = z.object({
  transferId: z.string().uuid()
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
    const validation = cancelSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { transferId } = validation.data

    // Get transfer details
    const { data: transfer, error: transferError } = await supabase
      .from('ticket_transfers')
      .select('*, tickets(events(title))')
      .eq('id', transferId)
      .eq('from_user_id', user.id)
      .single()

    if (transferError || !transfer) {
      return NextResponse.json(
        { error: 'Transfer not found or not owned by you' },
        { status: 404 }
      )
    }

    // Check transfer status
    if (transfer.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot cancel transfer with status: ${transfer.status}` },
        { status: 400 }
      )
    }

    // Cancel transfer
    const { error: updateError } = await supabase
      .from('ticket_transfers')
      .update({ status: 'cancelled' })
      .eq('id', transferId)

    if (updateError) {
      console.error('Transfer cancellation error:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel transfer' },
        { status: 500 }
      )
    }

    // Optionally notify recipient
    try {
      const { sendEmail, getTicketTransferCancelledEmail } = await import('@/lib/email')
      
      await sendEmail({
        to: transfer.to_email,
        subject: `Ticket transfer cancelled - ${transfer.tickets.events.title}`,
        html: getTicketTransferCancelledEmail({
          eventTitle: transfer.tickets.events.title,
          senderName: user.user_metadata?.full_name || 'The sender'
        })
      })
    } catch (emailError) {
      console.error('Failed to send cancellation notification:', emailError)
      // Continue - cancellation was successful
    }

    return NextResponse.json({
      success: true,
      status: 'cancelled'
    })

  } catch (error) {
    console.error('Transfer cancellation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
