// API Route: POST /api/tickets/transfer/request
// Initiate a ticket transfer to another user

import { createClient } from '@/lib/firebase-db/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const transferRequestSchema = z.object({
  ticketId: z.string().min(1),
  toEmail: z.string().email(),
  message: z.string().max(500).optional()
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
    const validation = transferRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { ticketId, toEmail, message } = validation.data

    // Prevent self-transfer
    if (toEmail.toLowerCase() === user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot transfer ticket to yourself' },
        { status: 400 }
      )
    }

    // Verify ticket ownership and status
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*, events(title, start_datetime, organizer_id)')
      .eq('id', ticketId)
      .eq('attendee_id', user.id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found or not owned by you' },
        { status: 404 }
      )
    }

    if (ticket.status !== 'active') {
      return NextResponse.json(
        { error: `Cannot transfer ticket with status: ${ticket.status}` },
        { status: 400 }
      )
    }

    if (ticket.checked_in) {
      return NextResponse.json(
        { error: 'Cannot transfer a ticket that has been checked in' },
        { status: 400 }
      )
    }

    // Check for existing pending transfers
    const { data: existingTransfer } = await supabase
      .from('ticket_transfers')
      .select('id')
      .eq('ticket_id', ticketId)
      .eq('status', 'pending')
      .single()

    if (existingTransfer) {
      return NextResponse.json(
        { error: 'A pending transfer already exists for this ticket' },
        { status: 400 }
      )
    }

    // Check if event allows transfers (optional - you could add a transfers_enabled field to events)
    const eventDate = new Date(ticket.events.start_datetime)
    if (eventDate < new Date()) {
      return NextResponse.json(
        { error: 'Cannot transfer tickets for past events' },
        { status: 400 }
      )
    }

    // Generate unique transfer token
    const transferToken = `transfer_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    // Set 24-hour expiry
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Create transfer request
    const { data: transfer, error: transferError } = await supabase
      .from('ticket_transfers')
      .insert({
        ticket_id: ticketId,
        from_user_id: user.id,
        to_email: toEmail.toLowerCase(),
        message: message || null,
        status: 'pending',
        transfer_token: transferToken,
        requested_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (transferError) {
      console.error('Transfer creation error:', transferError)
      return NextResponse.json(
        { error: 'Failed to create transfer request' },
        { status: 500 }
      )
    }

    // Send email notification to recipient
    try {
      const { sendEmail, getTicketTransferRequestEmail } = await import('@/lib/email')
      const { data: sender } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', user.id)
        .single()

      await sendEmail({
        to: toEmail,
        subject: `${sender?.full_name || 'Someone'} wants to transfer you a ticket`,
        html: getTicketTransferRequestEmail({
          senderName: sender?.full_name || 'A friend',
          senderEmail: sender?.email || '',
          eventTitle: ticket.events.title,
          eventDate: ticket.events.start_datetime,
          message: message || '',
          transferToken: transfer.transfer_token,
          expiresAt: transfer.expires_at
        })
      })

      // Check if recipient has account with phone number
      const { data: recipient } = await supabase
        .from('users')
        .select('phone')
        .eq('email', toEmail.toLowerCase())
        .single()

      if (recipient?.phone) {
        try {
          const { sendSms, getTicketTransferSms } = await import('@/lib/sms')
          await sendSms({
            to: recipient.phone,
            message: getTicketTransferSms({
              senderName: sender?.full_name || 'A friend',
              eventTitle: ticket.events.title,
              transferUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tickets/transfer/${transfer.transfer_token}`
            })
          })
        } catch (smsError) {
          console.error('Failed to send SMS notification:', smsError)
          // Continue - email was sent
        }
      }
    } catch (emailError) {
      console.error('Failed to send transfer notification:', emailError)
      // Continue - transfer was created successfully
    }

    return NextResponse.json({
      success: true,
      transfer: {
        id: transfer.id,
        status: transfer.status,
        toEmail: transfer.to_email,
        transferToken: transfer.transfer_token,
        expiresAt: transfer.expires_at
      }
    })

  } catch (error) {
    console.error('Transfer request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
