import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { createNotification } from '@/lib/notifications/helpers'
import { sendPushNotification } from '@/lib/notification-triggers'

/**
 * Favorite Event Reminder Cron Job
 * 
 * This endpoint should be called daily by a cron service
 * It reminds users about favorited events happening soon (within 7 days) that they haven't purchased tickets for
 * 
 * To set up in Vercel:
 * 1. Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/favorite-reminders",
 *     "schedule": "0 10 * * *"
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

    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Get all events happening in the next 7 days
    const eventsSnapshot = await adminDb
      .collection('events')
      .where('start_datetime', '>=', now)
      .where('start_datetime', '<=', sevenDaysFromNow)
      .where('status', '==', 'published')
      .get()

    if (eventsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No upcoming events in the next 7 days',
        remindersSent: 0
      })
    }

    const eventIds = eventsSnapshot.docs.map((doc: any) => doc.id)
    let remindersSent = 0

    // For each event, find users who favorited it
    for (const eventDoc of eventsSnapshot.docs) {
      const eventId = eventDoc.id
      const eventData = eventDoc.data()

      // Get users who favorited this event
      const favoritesSnapshot = await adminDb
        .collection('favorites')
        .where('event_id', '==', eventId)
        .get()

      if (favoritesSnapshot.empty) continue

      const userIds = favoritesSnapshot.docs.map((doc: any) => doc.data().user_id)

      // For each user, check if they have a ticket
      for (const userId of userIds) {
        const ticketsSnapshot = await adminDb
          .collection('tickets')
          .where('event_id', '==', eventId)
          .where('attendee_id', '==', userId)
          .where('status', '==', 'valid')
          .get()

        // If user has no ticket, send reminder
        if (ticketsSnapshot.empty) {
          try {
            const daysUntil = Math.ceil((eventData.start_datetime.toDate().getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            const timeMessage = daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`

            // Create in-app notification
            await createNotification(
              userId,
              'event_reminder_24h',
              `⭐ Reminder: ${eventData.title}`,
              `This event you favorited is happening ${timeMessage}! Get your tickets before they sell out.`,
              `/events/${eventId}`,
              { eventId, daysUntil }
            )

            // Send push notification
            await sendPushNotification(
              userId,
              `⭐ Favorited Event Starting ${timeMessage}`,
              `${eventData.title} - Don't miss out!`,
              `/events/${eventId}`,
              {
                type: 'favorite_reminder',
                eventId,
                daysUntil
              }
            )

            remindersSent++
          } catch (error) {
            console.error(`Failed to send reminder to user ${userId} for event ${eventId}:`, error)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      eventsChecked: eventIds.length,
      remindersSent,
      timestamp: now.toISOString()
    })
  } catch (error: any) {
    console.error('Favorite reminders cron error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process favorite reminders' },
      { status: 500 }
    )
  }
}
