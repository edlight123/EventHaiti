import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sendEmail } from '@/lib/email'

/**
 * POST /api/test-email
 * Test email sending functionality
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized or no email' }, { status: 401 })
    }

    const { to } = await request.json().catch(() => ({ to: null }))
    const recipient = to || user.email

    console.log(`📧 Attempting to send test email to: ${recipient}`)
    console.log(`📧 RESEND_API_KEY configured: ${process.env.RESEND_API_KEY ? 'Yes' : 'No'}`)
    console.log(`📧 EMAIL_FROM: ${process.env.EMAIL_FROM || 'Not set'}`)

    const result = await sendEmail({
      to: recipient,
      subject: 'Test Email from EventHaiti',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Test Email</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 40px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🧪 Test Email</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px;">Email System Test</h2>
                        <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                          This is a test email from EventHaiti. If you're receiving this, the email notification system is working correctly! 🎉
                        </p>
                        
                        <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 24px 0;">
                          <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;"><strong>Sent to:</strong> ${recipient}</p>
                          <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;"><strong>Sent at:</strong> ${new Date().toLocaleString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            timeZoneName: 'short'
                          })}</p>
                          <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>User:</strong> ${user.user_metadata?.full_name || 'Unknown'}</p>
                        </div>

                        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin: 24px 0;">
                          <p style="margin: 0; color: #1e40af; font-size: 14px;">
                            <strong>✅ Success!</strong> Your email notification system is properly configured and working.
                          </p>
                        </div>

                        <div style="text-align: center; margin-top: 32px;">
                          <a href="${process.env.NEXT_PUBLIC_APP_URL}/notifications" 
                             style="display: inline-block; background: #0d9488; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            View Notifications
                          </a>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                          EventHaiti - Experience Haiti's Best Events 🇭🇹
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    })

    console.log(`📧 Email send result:`, result)

    return NextResponse.json({
      success: result.success,
      to: recipient,
      messageId: result.messageId,
      error: result.error,
      resendConfigured: !!process.env.RESEND_API_KEY,
      isDummyKey: process.env.RESEND_API_KEY === 're_dummy_key_for_build',
      emailFrom: process.env.EMAIL_FROM || 'Not configured'
    })
  } catch (error: any) {
    console.error('❌ Test email error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        resendConfigured: !!process.env.RESEND_API_KEY,
        isDummyKey: process.env.RESEND_API_KEY === 're_dummy_key_for_build'
      },
      { status: 500 }
    )
  }
}
