import { createNotification, getNotificationPreferences } from './notifications'
import { getUserFCMTokens } from './fcm'
import type { NotificationType } from '@/types/database'

/**
 * Send a push notification via FCM (server-side only)
 * This should be called from API routes or server actions
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  // Get user's FCM tokens
  const tokens = await getUserFCMTokens(userId)
  
  if (tokens.length === 0) {
    console.log(`No FCM tokens found for user ${userId}`)
    return
  }

  // Send push notification via Firebase Cloud Messaging
  // This requires the Firebase Admin SDK which should be initialized server-side
  try {
    const response = await fetch('/api/notifications/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens,
        title,
        body,
        data
      })
    })

    if (!response.ok) {
      console.error('Failed to send push notification:', await response.text())
    }
  } catch (error) {
    console.error('Error sending push notification:', error)
  }
}

/**
 * Notify user about ticket purchase
 */
export async function notifyTicketPurchase(
  userId: string,
  eventTitle: string,
  ticketId: string,
  eventId: string
): Promise<void> {
  // Check user preferences
  const prefs = await getNotificationPreferences(userId)
  
  // Always create in-app notification
  await createNotification(
    userId,
    'ticket_purchased',
    'Ticket Purchased Successfully!',
    `Your ticket for "${eventTitle}" has been confirmed. Show your QR code at the entrance.`,
    eventId,
    ticketId
  )

  // Send push notification if enabled
  if (prefs.notifyTicketPurchase) {
    await sendPushNotification(
      userId,
      'Ticket Purchased! 🎫',
      `Your ticket for "${eventTitle}" is ready`,
      {
        type: 'ticket_purchased',
        ticketId,
        eventId
      }
    )
  }
}

/**
 * Notify all attendees about event update
 */
export async function notifyEventUpdate(
  eventId: string,
  eventTitle: string,
  updateMessage: string,
  attendeeIds: string[]
): Promise<void> {
  const notifications = attendeeIds.map(async (userId) => {
    const prefs = await getNotificationPreferences(userId)
    
    // Create in-app notification
    await createNotification(
      userId,
      'event_updated',
      `Event Update: ${eventTitle}`,
      updateMessage,
      eventId
    )

    // Send push notification if enabled
    if (prefs.notifyEventUpdates) {
      await sendPushNotification(
        userId,
        `Event Update: ${eventTitle}`,
        updateMessage,
        {
          type: 'event_updated',
          eventId
        }
      )
    }
  })

  await Promise.all(notifications)
}

/**
 * Send event reminder to attendees
 */
export async function sendEventReminder(
  eventId: string,
  eventTitle: string,
  startDateTime: Date,
  attendeeIds: string[],
  reminderType: 'event_reminder_24h' | 'event_reminder_3h' | 'event_reminder_30min'
): Promise<void> {
  const timeLabels = {
    event_reminder_24h: '24 hours',
    event_reminder_3h: '3 hours',
    event_reminder_30min: '30 minutes'
  }

  const timeLabel = timeLabels[reminderType]
  const formattedDate = startDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })

  const notifications = attendeeIds.map(async (userId) => {
    const prefs = await getNotificationPreferences(userId)
    
    if (!prefs.notifyReminders) {
      return // Skip if user has disabled reminders
    }

    // Create in-app notification
    await createNotification(
      userId,
      reminderType,
      `Reminder: ${eventTitle}`,
      `Your event starts in ${timeLabel}! ${formattedDate}`,
      eventId
    )

    // Send push notification
    await sendPushNotification(
      userId,
      `⏰ Event Reminder: ${eventTitle}`,
      `Starting in ${timeLabel} - ${formattedDate}`,
      {
        type: reminderType,
        eventId
      }
    )
  })

  await Promise.all(notifications)
}
