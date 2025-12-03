import { db } from '@/lib/firebase/client'
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import type { Notification } from '@/types/notifications'
import type { NotificationType } from '@/types/database'

/**
 * Create a new notification for a user
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  actionUrl?: string,
  metadata?: Record<string, any>
): Promise<string> {
  const notificationsRef = collection(db, 'users', userId, 'notifications')
  
  const notification: any = {
    userId,
    type,
    title,
    message,
    isRead: false,
    createdAt: Timestamp.now()
  }
  
  // Only add optional fields if they exist (Firestore doesn't allow undefined)
  if (actionUrl) notification.actionUrl = actionUrl
  if (metadata?.eventId) notification.eventId = metadata.eventId
  if (metadata?.ticketId) notification.ticketId = metadata.ticketId
  if (metadata) notification.metadata = metadata
  
  const docRef = await addDoc(notificationsRef, notification)
  return docRef.id
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<void> {
  const notificationRef = doc(db, 'users', userId, 'notifications', notificationId)
  await updateDoc(notificationRef, {
    read: true,
    readAt: Timestamp.now()
  })
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const notificationsRef = collection(db, 'users', userId, 'notifications')
  const q = query(notificationsRef, where('read', '==', false))
  const snapshot = await getDocs(q)
  
  const batch = writeBatch(db)
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      read: true,
      readAt: Timestamp.now()
    })
  })
  
  await batch.commit()
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<void> {
  const notificationRef = doc(db, 'users', userId, 'notifications', notificationId)
  await deleteDoc(notificationRef)
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const notificationsRef = collection(db, 'users', userId, 'notifications')
  const q = query(notificationsRef, where('read', '==', false))
  const snapshot = await getDocs(q)
  return snapshot.size
}

/**
 * Get recent notifications for a user
 */
export async function getNotifications(
  userId: string,
  limitCount: number = 50
): Promise<(Notification & { id: string })[]> {
  const notificationsRef = collection(db, 'users', userId, 'notifications')
  const q = query(
    notificationsRef,
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Notification & { id: string }))
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
