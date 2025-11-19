// Email service for sending notifications
// Using Resend API (direct fetch, no SDK) for production-ready email delivery

type EmailParams = {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailParams) {
  // In development or if no email API key, just log
  const apiKey = process.env.RESEND_API_KEY
  
  if (!apiKey) {
    console.log('📧 Email would be sent (no RESEND_API_KEY configured):', { to, subject })
    console.log('HTML Preview:', html.substring(0, 200) + '...')
    return { success: true, messageId: 'dev-mode' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'EventHaiti <noreply@eventhaiti.com>',
        to,
        subject,
        html,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email')
    }

    console.log('✅ Email sent successfully:', data.id)
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
