// Email service for sending notifications
// Using Resend API (direct fetch, no SDK) for production-ready email delivery

type EmailParams = {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailParams) {
  // Check API key configuration
  const apiKey = process.env.RESEND_API_KEY
  
  if (!apiKey) {
    console.warn('❌ RESEND_API_KEY not configured - email will not be sent')
    console.warn('   Add RESEND_API_KEY to your environment variables')
    console.warn(`   Would send to: ${to}`)
    console.warn(`   Subject: ${subject}`)
    return { success: false, error: 'No API key configured', messageId: undefined }
  }

  if (apiKey === 're_dummy_key_for_build') {
    console.warn('❌ RESEND_API_KEY is set to dummy value - email will not be sent')
    console.warn('   Replace with a real API key from https://resend.com')
    console.warn(`   Would send to: ${to}`)
    console.warn(`   Subject: ${subject}`)
    return { success: false, error: 'Dummy API key - replace with real key from Resend', messageId: undefined }
  }

  try {
    console.log(`📧 Sending email to ${to}: ${subject}`)
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'EventHaiti <onboarding@resend.dev>',
        to,
        subject,
        html,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Email API error:', data)
      throw new Error(data.message || 'Failed to send email')
    }

    console.log('✅ Email sent successfully! Message ID:', data.id)
    return { success: true, messageId: data.id }
  } catch (error: any) {
    console.error('❌ Failed to send email:', error)
    return { success: false, error: error.message }
  }
}

// Email templates
export function getTicketConfirmationEmail(params: {
  attendeeName: string
  eventTitle: string
  eventDate: string
  eventVenue: string
  ticketId: string
  qrCodeDataURL?: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your EventHaiti Ticket</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #f97316 0%, #ec4899 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">EventHaiti</h1>
                    <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Your ticket is confirmed! 🎉</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px;">Bonjou ${params.attendeeName}!</h2>
                    <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                      Your ticket for <strong style="color: #111827;">${params.eventTitle}</strong> has been confirmed.
                    </p>
                    
                    <!-- Event Details -->
                    <table role="presentation" style="width: 100%; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin: 24px 0;">
                      <tr>
                        <td style="padding: 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Event</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 16px; font-weight: 600;">${params.eventTitle}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Date & Time</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 16px;">${params.eventDate}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px; background-color: #f9fafb;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Location</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 16px;">${params.eventVenue}</p>
                        </td>
                      </tr>
                    </table>
                    
                    ${params.qrCodeDataURL ? `
                    <!-- QR Code -->
                    <div style="text-align: center; margin: 32px 0;">
                      <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">Show this QR code at the entrance:</p>
                      <img src="${params.qrCodeDataURL}" alt="Ticket QR Code" style="width: 200px; height: 200px; border: 4px solid #f3f4f6; border-radius: 12px;">
                      <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px; font-family: monospace;">Ticket ID: ${params.ticketId.slice(0, 8)}</p>
                    </div>
                    ` : ''}
                    
                    <div style="margin: 32px 0; padding: 16px; background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 8px;">
                      <p style="margin: 0; color: #1e40af; font-size: 14px;">
                        <strong>💡 Pro tip:</strong> Save this email or take a screenshot of your QR code for quick access at the event.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; text-align: center;">
                      Questions? Contact the organizer or visit <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://eventhaiti.com'}" style="color: #f97316; text-decoration: none;">EventHaiti.com</a>
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      Made with ❤️ in Haiti 🇭🇹
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

export function getEventCreatedEmail(params: {
  organizerName: string
  eventTitle: string
  eventDate: string
  eventId: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Event Created Successfully</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
                <tr>
                  <td style="background: linear-gradient(135deg, #f97316 0%, #ec4899 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px;">EventHaiti</h1>
                    <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9);">Event Published! 🎊</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 16px; color: #111827;">Félicitations ${params.organizerName}!</h2>
                    <p style="margin: 0 0 24px; color: #6b7280; line-height: 1.6;">
                      Your event <strong>${params.eventTitle}</strong> is now live on EventHaiti!
                    </p>
                    <p style="margin: 0 0 24px; color: #6b7280;">
                      Event Date: <strong>${params.eventDate}</strong>
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL}/organizer/events/${params.eventId}" style="display: inline-block; padding: 14px 32px; background-color: #f97316; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Manage Your Event
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

export function getRefundRequestEmail(params: {
  organizerName: string
  eventTitle: string
  attendeeEmail: string
  reason: string
  ticketId: string
  amount: number
}) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #f97316 0%, #ec4899 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Refund Request</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px;">Hi ${params.organizerName},</h2>
                    <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                      An attendee has requested a refund for <strong style="color: #111827;">${params.eventTitle}</strong>.
                    </p>
                    
                    <table role="presentation" style="width: 100%; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin: 24px 0;">
                      <tr>
                        <td style="padding: 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px;">Attendee Email</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 16px;">${params.attendeeEmail}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px;">Refund Amount</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 16px; font-weight: 600;">$${params.amount.toFixed(2)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px; background-color: #f9fafb;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px;">Reason</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 16px;">${params.reason}</p>
                        </td>
                      </tr>
                    </table>

                    <div style="text-align: center; margin-top: 32px;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL}/organizer/events" style="display: inline-block; padding: 14px 32px; background-color: #f97316; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Review Refund Request
                      </a>
                    </div>

                    <p style="margin: 24px 0 0; color: #9ca3af; font-size: 14px; text-align: center;">
                      Ticket ID: ${params.ticketId}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

export function getRefundProcessedEmail(params: {
  attendeeName: string
  eventTitle: string
  status: 'approved' | 'denied'
  refundAmount: number
  ticketId: string
}) {
  const isApproved = params.status === 'approved'
  
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: ${isApproved ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'}; padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      Refund ${isApproved ? 'Approved' : 'Denied'}
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px;">Hi ${params.attendeeName},</h2>
                    <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                      Your refund request for <strong style="color: #111827;">${params.eventTitle}</strong> has been ${isApproved ? 'approved' : 'denied'}.
                    </p>
                    
                    ${isApproved ? `
                      <table role="presentation" style="width: 100%; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin: 24px 0;">
                        <tr>
                          <td style="padding: 16px; background-color: #f9fafb;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px;">Refund Amount</p>
                            <p style="margin: 4px 0 0; color: #10b981; font-size: 24px; font-weight: 700;">$${params.refundAmount.toFixed(2)}</p>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 24px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                        The refund will be processed to your original payment method within 5-10 business days.
                      </p>
                    ` : `
                      <p style="margin: 24px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                        Unfortunately, the organizer was unable to approve your refund request. Please contact the organizer directly for more information.
                      </p>
                    `}

                    <p style="margin: 24px 0 0; color: #9ca3af; font-size: 14px; text-align: center;">
                      Ticket ID: ${params.ticketId}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

export function getWaitlistNotificationEmail(params: {
  eventTitle: string
  eventDate: string
  quantity: number
  eventId: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Tickets Available! 🎟️</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px;">Great News!</h2>
                    <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                      Tickets are now available for <strong style="color: #111827;">${params.eventTitle}</strong>!
                    </p>
                    
                    <table role="presentation" style="width: 100%; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin: 24px 0;">
                      <tr>
                        <td style="padding: 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px;">Event</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 16px; font-weight: 600;">${params.eventTitle}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px; background-color: #f9fafb;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px;">Date</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 16px;">${new Date(params.eventDate).toLocaleString()}</p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 24px 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                      You requested ${params.quantity} ticket${params.quantity > 1 ? 's' : ''}. Grab ${params.quantity > 1 ? 'them' : 'it'} before ${params.quantity > 1 ? "they're" : "it's"} gone!
                    </p>

                    <div style="text-align: center; margin-top: 32px;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL}/events/${params.eventId}" style="display: inline-block; padding: 14px 32px; background-color: #8b5cf6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Buy Tickets Now
                      </a>
                    </div>

                    <p style="margin: 24px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      This is a limited time offer. Tickets are available on a first-come, first-served basis.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

export function getTicketTransferRequestEmail(params: {
  senderName: string
  senderEmail: string
  eventTitle: string
  eventDate: string
  message: string
  transferToken: string
  expiresAt: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Ticket Transfer 🎟️</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px;">You've Received a Ticket!</h2>
                    <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                      <strong style="color: #111827;">${params.senderName}</strong> (${params.senderEmail}) wants to transfer you a ticket for <strong style="color: #111827;">${params.eventTitle}</strong>.
                    </p>
                    
                    ${params.message ? `
                      <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px; font-style: italic;">
                          "${params.message}"
                        </p>
                      </div>
                    ` : ''}

                    <table role="presentation" style="width: 100%; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin: 24px 0;">
                      <tr>
                        <td style="padding: 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px;">Event</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 16px; font-weight: 600;">${params.eventTitle}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px;">Date</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 16px;">${new Date(params.eventDate).toLocaleString()}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px; background-color: #f9fafb;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px;">Expires</p>
                          <p style="margin: 4px 0 0; color: #ef4444; font-size: 14px; font-weight: 600;">${new Date(params.expiresAt).toLocaleString()}</p>
                        </td>
                      </tr>
                    </table>

                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL}/tickets/transfer/${params.transferToken}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin-right: 12px;">
                        Accept Transfer
                      </a>
                      <a href="${process.env.NEXT_PUBLIC_APP_URL}/tickets/transfer/${params.transferToken}?action=reject" style="display: inline-block; padding: 14px 32px; background-color: #6b7280; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Decline
                      </a>
                    </div>

                    <p style="margin: 24px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      This transfer will expire automatically if not accepted within 7 days.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

export function getTicketTransferResponseEmail(params: {
  recipientName: string
  eventTitle: string
  action: 'accepted' | 'rejected'
  ticketId: string
}) {
  const isAccepted = params.action === 'accepted'
  
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: ${isAccepted ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'}; padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      Transfer ${isAccepted ? 'Accepted' : 'Declined'}
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px;">Transfer Update</h2>
                    <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                      <strong style="color: #111827;">${params.recipientName}</strong> has ${isAccepted ? 'accepted' : 'declined'} your ticket transfer for <strong style="color: #111827;">${params.eventTitle}</strong>.
                    </p>
                    
                    ${isAccepted ? `
                      <p style="margin: 24px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                        The ticket has been successfully transferred. The new owner will receive their own ticket confirmation.
                      </p>
                    ` : `
                      <p style="margin: 24px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                        Your ticket is still yours. You can try transferring it to someone else if needed.
                      </p>
                      <div style="text-align: center; margin-top: 32px;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/tickets/${params.ticketId}" style="display: inline-block; padding: 14px 32px; background-color: #f97316; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
                          View Ticket
                        </a>
                      </div>
                    `}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

export function getTicketTransferCancelledEmail(params: {
  eventTitle: string
  senderName: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Transfer Cancelled</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px;">Transfer Withdrawn</h2>
                    <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                      ${params.senderName} has cancelled the ticket transfer for <strong style="color: #111827;">${params.eventTitle}</strong>.
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 14px;">
                      No action is needed on your part.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

export function getEventUpdateEmail(params: {
  attendeeName: string
  eventTitle: string
  updateTitle: string
  updateMessage: string
  eventId: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">📢 Event Update</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 8px; color: #111827; font-size: 24px;">Hi ${params.attendeeName}!</h2>
                    <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px;">
                      An update has been posted for <strong style="color: #111827;">${params.eventTitle}</strong>
                    </p>
                    
                    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 24px; margin: 24px 0; border-radius: 8px;">
                      <h3 style="margin: 0 0 12px; color: #78350f; font-size: 18px; font-weight: 600;">
                        ${params.updateTitle}
                      </h3>
                      <p style="margin: 0; color: #92400e; font-size: 15px; line-height: 1.6; white-space: pre-line;">
                        ${params.updateMessage}
                      </p>
                    </div>

                    <div style="text-align: center; margin-top: 32px;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL}/events/${params.eventId}" style="display: inline-block; padding: 14px 32px; background-color: #f97316; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        View Event Details
                      </a>
                    </div>

                    <p style="margin: 24px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      This update was sent by the event organizer to all ticket holders.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}
