import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { NotificationType } from '@/types/database'

/**
 * SERVER-SIDE notification helpers using Firebase Admin SDK
 * These functions should only be called from API routes and server components
 */

/**
 * Create a new notification for a user (SERVER-SIDE)
 * Uses Firebase Admin SDK for server-side operations
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  actionUrl?: string,
  metadata?: Record<string, any>
): Promise<string> {
  const notificationsRef = adminDb.collection('users').doc(userId).collection('notifications')
  
  const notification: any = {
    userId,
    type,
    title,
    message,
    isRead: false,
    createdAt: FieldValue.serverTimestamp()
  }
  
  // Only add optional fields if they exist (Firestore doesn't allow undefined)
  if (actionUrl) notification.actionUrl = actionUrl
  if (metadata?.eventId) notification.eventId = metadata.eventId
  if (metadata?.ticketId) notification.ticketId = metadata.ticketId
  if (metadata) notification.metadata = metadata
  
  const docRef = await notificationsRef.add(notification)
  return docRef.id
}

/**
 * Send notification on ticket purchase
 */
export async function notifyTicketPurchase(
  userId: string,
  eventId: string,
  eventTitle: string,
  ticketCount: number
): Promise<void> {
  await createNotification(
    userId,
    'ticket_purchased',
    'Ticket Purchase Confirmed! 🎉',
    `Your ${ticketCount} ticket${ticketCount > 1 ? 's' : ''} for "${eventTitle}" ${ticketCount > 1 ? 'have' : 'has'} been confirmed.`,
    `/tickets/event/${eventId}`,
    { eventId, ticketCount }
  )
  
  // Also trigger web-push notification via notification-triggers
  try {
    const { notifyTicketPurchase: sendPush } = await import('@/lib/notification-triggers')
    await sendPush(userId, eventTitle, eventId, eventId) // last param is ticketId placeholder
  } catch (error) {
    console.error('Failed to send push notification:', error)
  }
}

/**
 * Send notification when event is updated
 */
export async function notifyEventUpdate(
  userId: string,
  eventId: string,
  eventTitle: string,
  updateType: 'time' | 'venue' | 'general'
): Promise<void> {
  const messages = {
    time: `The time for "${eventTitle}" has been updated. Check your tickets for details.`,
    venue: `The venue for "${eventTitle}" has changed. Check your tickets for the new location.`,
    general: `"${eventTitle}" has been updated. Check your tickets for details.`
  }
  
  await createNotification(
    userId,
    'event_updated',
    'Event Update',
    messages[updateType],
    `/events/${eventId}`,
    { eventId, updateType }
  )
}

/**
 * Send event reminder notification
 */
export async function notifyEventReminder(
  userId: string,
  eventId: string,
  eventTitle: string,
  timeUntil: '24h' | '3h' | '30min'
): Promise<void> {
  const timeLabels = {
    '24h': '24 hours',
    '3h': '3 hours',
    '30min': '30 minutes'
  }
  
  const emojis = {
    '24h': '📅',
    '3h': '⏰',
    '30min': '🔔'
  }
  
  await createNotification(
    userId,
    timeUntil === '24h' ? 'event_reminder_24h' : timeUntil === '3h' ? 'event_reminder_3h' : 'event_reminder_30min',
    `${emojis[timeUntil]} Event Reminder`,
    `"${eventTitle}" starts in ${timeLabels[timeUntil]}!`,
    `/tickets/event/${eventId}`,
    { eventId, timeUntil }
  )
}

/**
 * Notify organizer when a ticket is sold
 */
export async function notifyOrganizerTicketSale(
  organizerId: string,
  eventId: string,
  eventTitle: string,
  ticketCount: number,
  revenue: number,
  buyerName?: string
): Promise<void> {
  const buyer = buyerName || 'Someone'
  await createNotification(
    organizerId,
    'ticket_purchased',
    `🎫 ${ticketCount} New Ticket${ticketCount > 1 ? 's' : ''} Sold!`,
    `${buyer} just purchased ${ticketCount} ticket${ticketCount > 1 ? 's' : ''} for "${eventTitle}". Revenue: $${revenue.toFixed(2)}`,
    `/organizer/events/${eventId}/attendees`,
    { eventId, ticketCount, revenue }
  )
  
  // Also trigger web-push notification via notification-triggers
  try {
    const { notifyOrganizerTicketSale: sendPush } = await import('@/lib/notification-triggers')
    await sendPush(organizerId, eventTitle, eventId, ticketCount, revenue)
  } catch (error) {
    console.error('Failed to send push notification:', error)
  }
}

