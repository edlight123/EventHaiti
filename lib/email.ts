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
  const ticketCode = String(params.ticketId || '').slice(0, 12).toUpperCase()
  const ticketsUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://eventhaiti.com'}/tickets`

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your EventHaiti Ticket</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0b1220;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 36px 12px;">
              <table role="presentation" style="width: 640px; max-width: 100%; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);">
                <tr>
                  <td style="padding: 28px 28px 18px; background: linear-gradient(135deg, #f97316 0%, #ec4899 55%, #8b5cf6 100%);">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="left">
                          <div style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: 0.2px;">EventHaiti</div>
                          <div style="margin-top: 6px; font-size: 13px; color: rgba(255, 255, 255, 0.92);">Ticket confirmed</div>
                        </td>
                        <td align="right" style="font-size: 12px; color: rgba(255, 255, 255, 0.85);">
                          <span style="display: inline-block; padding: 6px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.16);">${ticketCode}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 26px 28px 8px;">
                    <div style="font-size: 20px; font-weight: 800; color: #111827;">Hi ${params.attendeeName},</div>
                    <div style="margin-top: 8px; font-size: 15px; line-height: 1.7; color: #4b5563;">
                      Your ticket is confirmed for <strong style="color: #111827;">${params.eventTitle}</strong>.
                      Present the QR code below at the entrance.
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 18px 28px 0;">
                    <table role="presentation" style="width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;">
                      <tr>
                        <td style="padding: 16px 16px 8px; background-color: #f9fafb;">
                          <div style="font-size: 11px; color: #6b7280; letter-spacing: 0.6px; text-transform: uppercase;">Event</div>
                          <div style="margin-top: 4px; font-size: 16px; font-weight: 700; color: #111827;">${params.eventTitle}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 16px; border-top: 1px solid #e5e7eb; background-color: #ffffff;">
                          <div style="font-size: 11px; color: #6b7280; letter-spacing: 0.6px; text-transform: uppercase;">Date & Time</div>
                          <div style="margin-top: 4px; font-size: 15px; color: #111827;">${params.eventDate}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 16px; border-top: 1px solid #e5e7eb; background-color: #ffffff;">
                          <div style="font-size: 11px; color: #6b7280; letter-spacing: 0.6px; text-transform: uppercase;">Location</div>
                          <div style="margin-top: 4px; font-size: 15px; color: #111827;">${params.eventVenue}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 18px 28px 0;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;">
                      <tr>
                        <td style="padding: 18px; background-color: #ffffff;" align="center">
                          <div style="font-size: 12px; color: #6b7280;">Scan at entry</div>
                          <div style="height: 12px;"></div>
                          ${params.qrCodeDataURL ? `
                            <img src="${params.qrCodeDataURL}" alt="Ticket QR Code" style="width: 220px; height: 220px; display: block; border-radius: 14px; border: 1px solid #e5e7eb; background: #ffffff;">
                          ` : ''}
                          <div style="height: 12px;"></div>
                          <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 14px; color: #111827; letter-spacing: 0.6px;">${ticketCode}</div>
                          <div style="margin-top: 6px; font-size: 12px; color: #9ca3af;">If the image is blocked, show this code to staff.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 18px 28px 0;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;">
                      <tr>
                        <td style="padding: 14px 16px;">
                          <div style="font-size: 13px; color: #111827; font-weight: 700;">Entry tips</div>
                          <div style="margin-top: 8px; font-size: 13px; line-height: 1.7; color: #4b5563;">
                            • Arrive 15–30 minutes early<br>
                            • Bring a valid ID if requested<br>
                            • Save this email or take a screenshot
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding: 22px 28px 8px;">
                    <a href="${ticketsUrl}" style="display: inline-block; padding: 12px 18px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px;">View my tickets</a>
                    <div style="height: 10px;"></div>
                    <div style="font-size: 12px; color: #9ca3af;">Questions? Reply to this email or contact the organizer.</div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 18px 28px 24px; background-color: #ffffff;">
                    <div style="height: 1px; background-color: #f3f4f6; width: 100%;"></div>
                    <div style="margin-top: 14px; text-align: center; font-size: 12px; color: #9ca3af;">
                      EventHaiti • Discover events in Haiti
                      <br>
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://eventhaiti.com'}" style="color: #6b7280; text-decoration: none;">eventhaiti.com</a>
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
