import { createNotification, getNotificationPreferences } from './notifications'
import type { NotificationType } from '@/types/database'

/**
 * Send a web push notification to a user (server-side only)
 * Uses our working web-push API instead of FCM
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  url?: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/push/send-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title,
        body,
        url,
        data
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to send push notification:', error)
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
      `/events/${eventId}/tickets/${ticketId}`,
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
        `/events/${eventId}`,
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
      `/events/${eventId}`,
      {
        type: reminderType,
        eventId
      }
    )
  })

  await Promise.all(notifications)
}

/**
 * Notify organizer about a ticket sale
 */
export async function notifyOrganizerTicketSale(
  organizerId: string,
  eventTitle: string,
  eventId: string,
  ticketCount: number,
  revenue: number
): Promise<void> {
  // Check organizer preferences
  const prefs = await getNotificationPreferences(organizerId)
  
  // Create in-app notification
  await createNotification(
    organizerId,
    'ticket_purchased',
    `🎫 ${ticketCount} New Ticket${ticketCount > 1 ? 's' : ''} Sold!`,
    `${ticketCount} ticket${ticketCount > 1 ? 's' : ''} sold for "${eventTitle}". Revenue: $${revenue.toFixed(2)}`,
    eventId
  )

  // Send push notification if enabled
  if (prefs.notifyTicketPurchase) {
    await sendPushNotification(
      organizerId,
      `🎫 New Sale: ${eventTitle}`,
      `${ticketCount} ticket${ticketCount > 1 ? 's' : ''} sold - $${revenue.toFixed(2)}`,
      `/organizer/events/${eventId}/attendees`,
      {
        type: 'ticket_sale',
        eventId,
        ticketCount,
        revenue
      }
    )
  }
}
