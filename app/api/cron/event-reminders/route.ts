import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, getTicketConfirmationEmail } from '@/lib/email'
import { sendWhatsAppMessage, getEventReminderWhatsApp } from '@/lib/whatsapp'

/**
 * Event Reminder Cron Job
 * 
 * This endpoint should be called daily by a cron service (Vercel Cron, GitHub Actions, etc.)
 * It sends email and WhatsApp reminders 24 hours before events start
 * 
 * To set up in Vercel:
 * 1. Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/event-reminders",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 * 
 * To secure this endpoint, add CRON_SECRET to environment variables
 */

export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get events starting in 24 hours (±1 hour buffer)
    const now = new Date()
    const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000)
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000)

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .gte('start_datetime', in23Hours.toISOString())
      .lte('start_datetime', in25Hours.toISOString())
      .eq('is_published', true)

    if (eventsError || !events || events.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No events starting in 24 hours',
        count: 0,
      })
    }

    let emailsSent = 0
    let whatsappSent = 0

    // For each event, get ticket holders and send reminders
    for (const event of events) {
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          *,
          attendee:users (*)
        `)
        .eq('event_id', event.id)
        .eq('status', 'valid')

      if (ticketsError || !tickets) continue

      for (const ticket of tickets) {
        if (!ticket.attendee) continue

        // Send email reminder
        const emailResult = await sendEmail({
          to: ticket.attendee.email,
          subject: `Reminder: ${event.title} starts tomorrow!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Event Reminder</h1>
              </div>
              
              <div style="padding: 40px 20px; background: #f9fafb;">
                <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <p style="font-size: 18px; color: #111827; margin-bottom: 10px;">Hi ${ticket.attendee.full_name || 'there'}!</p>
                  
                  <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                    This is a friendly reminder that <strong>${event.title}</strong> starts in 24 hours!
                  </p>
                  
                  <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">📅 Date:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">
                          ${new Date(event.start_datetime).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">🕐 Time:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">
                          ${new Date(event.start_datetime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">📍 Location:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">
                          ${event.venue_name}, ${event.city}
                        </td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                    Don't forget to bring your ticket (digital or printed)!
                  </p>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/tickets/${ticket.id}" 
                       style="display: inline-block; background: #0d9488; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View My Ticket
                    </a>
                  </div>
                </div>
              </div>
              
              <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                <p>EventHaiti - Experience Haiti's Best Events</p>
              </div>
            </div>
          `,
        })

        if (emailResult.success) emailsSent++

        // Send WhatsApp reminder if phone available
        if (ticket.attendee.phone) {
          const whatsappResult = await sendWhatsAppMessage({
            to: ticket.attendee.phone,
            message: getEventReminderWhatsApp(
              ticket.attendee.full_name || 'Guest',
              event.title,
              24,
              `${event.venue_name}, ${event.city}`
            ),
          })

          if (whatsappResult.success) whatsappSent++
        }
      }
    }

    return NextResponse.json({
      success: true,
      eventsProcessed: events.length,
      emailsSent,
      whatsappSent,
    })
  } catch (error: any) {
    console.error('Event reminder cron error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process event reminders' },
      { status: 500 }
    )
  }
}
