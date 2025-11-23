import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { ticketId, userId } = await request.json()

    if (!ticketId || !userId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get ticket and event details
    const { createClient } = await import('@/lib/firebase-db/server')
    const supabase = await createClient()

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      console.error('Error fetching ticket:', ticketError)
      return Response.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', ticket.event_id)
      .single()

    if (eventError || !event) {
      console.error('Error fetching event:', eventError)
      return Response.json({ error: 'Event not found' }, { status: 404 })
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('Error fetching user:', userError)
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    // Format event date
    const eventDate = new Date(event.start_datetime)
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    // Send confirmation email
    const { data, error } = await resend.emails.send({
      from: 'EventHaiti <noreply@eventhaiti.com>',
      to: user.email,
      subject: `Ticket Confirmation - ${event.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0d9488 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .ticket { background: white; border: 2px dashed #0d9488; border-radius: 10px; padding: 20px; margin: 20px 0; }
            .ticket-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .ticket-row:last-child { border-bottom: none; }
            .label { color: #6b7280; font-weight: 600; }
            .value { color: #111827; font-weight: 700; }
            .qr-code { text-align: center; padding: 20px; background: white; margin: 20px 0; border-radius: 10px; }
            .button { display: inline-block; background: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .info-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎟️ Ticket Confirmed!</h1>
            </div>
            
            <div class="content">
              <p>Hi ${user.full_name || 'there'},</p>
              
              <p>Great news! Your ticket purchase has been confirmed. We can't wait to see you at the event!</p>
              
              <div class="ticket">
                <h2 style="margin-top: 0; color: #0d9488;">${event.title}</h2>
                
                <div class="ticket-row">
                  <span class="label">📅 Date</span>
                  <span class="value">${formattedDate}</span>
                </div>
                
                <div class="ticket-row">
                  <span class="label">🕐 Time</span>
                  <span class="value">${formattedTime}</span>
                </div>
                
                <div class="ticket-row">
                  <span class="label">📍 Location</span>
                  <span class="value">${event.venue_name}, ${event.city}</span>
                </div>
                
                <div class="ticket-row">
                  <span class="label">🎫 Ticket ID</span>
                  <span class="value">#${ticket.ticket_number}</span>
                </div>
                
                <div class="ticket-row">
                  <span class="label">💰 Amount Paid</span>
                  <span class="value">$${(ticket.price_paid || 0).toFixed(2)} USD</span>
                </div>
              </div>
              
              <div class="qr-code">
                <p style="margin: 0 0 10px 0; color: #6b7280;">Show this QR code at the entrance:</p>
                <div style="background: #f3f4f6; padding: 20px; display: inline-block; border-radius: 8px;">
                  <p style="font-family: monospace; font-size: 24px; margin: 0;">QR: ${ticket.ticket_number}</p>
                  <p style="font-size: 12px; color: #6b7280; margin: 10px 0 0 0;">(QR code image will be implemented)</p>
                </div>
              </div>
              
              <div class="info-box">
                <strong>💡 Important Information:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>Please arrive 15-30 minutes before the event starts</li>
                  <li>Bring a valid ID for verification</li>
                  <li>Keep this email for your records</li>
                  <li>Screenshots of the QR code are accepted</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://eventhaiti.com'}/tickets" class="button">
                  View My Tickets
                </a>
              </div>
              
              <p>If you have any questions, feel free to contact the event organizer or our support team.</p>
              
              <p>See you there! 🎉</p>
            </div>
            
            <div class="footer">
              <p>EventHaiti - Discover Events in Haiti</p>
              <p style="font-size: 12px;">
                This email was sent to ${user.email}. If you didn't make this purchase, please contact us immediately.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    })

    if (error) {
      console.error('Error sending email:', error)
      return Response.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return Response.json({ success: true, data })
  } catch (error) {
    console.error('Error in send-ticket-confirmation:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
