import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { logTicketTransfer } from '@/lib/security'
import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ticketId, toEmail, reason } = await req.json()

    if (!ticketId || !toEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify ticket belongs to current user
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*, events(*)')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found or does not belong to you' },
        { status: 404 }
      )
    }

    // Check if ticket has already been scanned
    if (ticket.scanned_count > 0) {
      return NextResponse.json(
        { error: 'Cannot transfer ticket that has already been used' },
        { status: 400 }
      )
    }

    // Check transfer count
    if (ticket.transfer_count >= 3) {
      return NextResponse.json(
        { error: 'This ticket has been transferred too many times' },
        { status: 400 }
      )
    }

    // Find or create recipient user by email
    const { data: recipientUser, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', toEmail.toLowerCase())
      .single()

    if (userError || !recipientUser) {
      // For now, require recipient to have an account
      // In production, could send invitation email
      return NextResponse.json(
        { error: 'Recipient must have an EventHaiti account. Ask them to sign up first.' },
        { status: 400 }
      )
    }

    // Prevent self-transfer
    if (recipientUser.id === user.id) {
      return NextResponse.json(
        { error: 'Cannot transfer ticket to yourself' },
        { status: 400 }
      )
    }

    // Get IP address for logging
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    // Log the transfer
    await logTicketTransfer(ticketId, user.id, recipientUser.id, ipAddress, reason)

    // Send email to recipient
    await resend.emails.send({
      from: 'EventHaiti <tickets@eventhaiti.com>',
      to: recipientUser.email,
      subject: `Ticket Transferred: ${ticket.events.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0d9488;">🎟️ You've Received a Ticket!</h1>
          
          <p>Hi ${recipientUser.name},</p>
          
          <p><strong>${user.name}</strong> has transferred a ticket to you for:</p>
          
          <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 16px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #0d9488;">${ticket.events.title}</h2>
            <p style="margin: 8px 0;"><strong>Date:</strong> ${new Date(ticket.events.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            <p style="margin: 8px 0;"><strong>Time:</strong> ${ticket.events.time}</p>
            <p style="margin: 8px 0;"><strong>Location:</strong> ${ticket.events.location}</p>
            <p style="margin: 8px 0;"><strong>Ticket ID:</strong> ${ticket.id}</p>
          </div>
          
          ${reason ? `<p><strong>Transfer Reason:</strong> ${reason}</p>` : ''}
          
          <p>This ticket is now yours! You can find it in your EventHaiti account.</p>
          
          <a href="https://eventhaiti.com/tickets" 
             style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            View My Tickets
          </a>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            <strong>Important:</strong> This ticket has been transferred ${ticket.transfer_count + 1} time(s). 
            Tickets can only be transferred up to 3 times total.
          </p>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If you did not expect this ticket, please contact us at support@eventhaiti.com
          </p>
        </div>
      `,
    })

    // Send confirmation email to original owner
    await resend.emails.send({
      from: 'EventHaiti <tickets@eventhaiti.com>',
      to: user.email,
      subject: `Ticket Transfer Confirmed: ${ticket.events.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0d9488;">✅ Ticket Transfer Confirmed</h1>
          
          <p>Hi ${user.name},</p>
          
          <p>Your ticket for <strong>${ticket.events.title}</strong> has been successfully transferred to:</p>
          
          <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 16px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>Recipient:</strong> ${recipientUser.name} (${recipientUser.email})</p>
            <p style="margin: 8px 0;"><strong>Transfer Date:</strong> ${new Date().toLocaleString()}</p>
            ${reason ? `<p style="margin: 8px 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>
          
          <p>You will no longer have access to this ticket. The ticket is now owned by ${recipientUser.name}.</p>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If you did not authorize this transfer, please contact us immediately at support@eventhaiti.com
          </p>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      message: `Ticket transferred to ${recipientUser.name}`,
    })
  } catch (error) {
    console.error('Error transferring ticket:', error)
    return NextResponse.json(
      { error: 'Failed to transfer ticket' },
      { status: 500 }
    )
  }
}
