import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  getDoc,
  writeBatch,
  Timestamp,
  DocumentReference
} from 'firebase/firestore'
import { db } from './firebase/client'
import type { Notification, NotificationPreferences } from '@/types/notifications'
import type { NotificationType } from '@/types/database'

/**
 * Create a new in-app notification for a user
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  eventId?: string,
  ticketId?: string
): Promise<string> {
  const notificationsRef = collection(db, 'users', userId, 'notifications')
  
  const notification = {
    type,
    title,
    message,
    eventId: eventId || null,
    ticketId: ticketId || null,
    isRead: false,
    createdAt: Timestamp.now(),
    readAt: null
  }
  
  const docRef = await addDoc(notificationsRef, notification)
  return docRef.id
}

/**
 * Mark a notification as read
 */
export async function markAsRead(userId: string, notificationId: string): Promise<void> {
  const notificationRef = doc(db, 'users', userId, 'notifications', notificationId)
  await updateDoc(notificationRef, {
    isRead: true,
    readAt: Timestamp.now()
  })
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  const notificationsRef = collection(db, 'users', userId, 'notifications')
  const q = query(notificationsRef, where('isRead', '==', false))
  const snapshot = await getDocs(q)
  
  if (snapshot.empty) return
  
  const batch = writeBatch(db)
  snapshot.docs.forEach((docSnapshot) => {
    batch.update(docSnapshot.ref, {
      isRead: true,
      readAt: Timestamp.now()
    })
  })
  
  await batch.commit()
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications')
    const q = query(notificationsRef, where('isRead', '==', false))
    const snapshot = await getDocs(q)
    return snapshot.size
  } catch (error: any) {
    // Handle permission errors gracefully
    if (error?.code === 'permission-denied') {
      console.warn('Firestore permission denied for notifications. Please deploy firestore.rules.')
      return 0
    }
    console.error('Error getting unread count:', error)
    return 0
  }
}

/**
 * Get user notifications with pagination
 */
export async function getUserNotifications(
  userId: string,
  limitCount: number = 50
): Promise<Notification[]> {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications')
    const q = query(
      notificationsRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      userId,
      type: doc.data().type,
      title: doc.data().title,
      message: doc.data().message,
      eventId: doc.data().eventId || undefined,
      ticketId: doc.data().ticketId || undefined,
      isRead: doc.data().isRead,
      createdAt: doc.data().createdAt.toDate().toISOString(),
      readAt: doc.data().readAt?.toDate()?.toISOString() || undefined
    }))
  } catch (error: any) {
    // Handle permission errors gracefully
    if (error?.code === 'permission-denied') {
      console.warn('Firestore permission denied for notifications. Please deploy firestore.rules.')
      return []
    }
    console.error('Error getting user notifications:', error)
    return []
  }
}

/**
 * Get user notification preferences
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const userRef = doc(db, 'users', userId)
  const userDoc = await getDoc(userRef)
  
  if (!userDoc.exists()) {
    return {
      notifyTicketPurchase: true,
      notifyEventUpdates: true,
      notifyReminders: true
    }
  }
  
  const data = userDoc.data()
  return {
    notifyTicketPurchase: data.notify_ticket_purchase ?? true,
    notifyEventUpdates: data.notify_event_updates ?? true,
    notifyReminders: data.notify_reminders ?? true
  }
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  const userRef = doc(db, 'users', userId)
  
  const updates: any = {}
  if (preferences.notifyTicketPurchase !== undefined) {
    updates.notify_ticket_purchase = preferences.notifyTicketPurchase
  }
  if (preferences.notifyEventUpdates !== undefined) {
    updates.notify_event_updates = preferences.notifyEventUpdates
  }
  if (preferences.notifyReminders !== undefined) {
    updates.notify_reminders = preferences.notifyReminders
  }
  
  await updateDoc(userRef, updates)
}

/**
 * Delete old read notifications (cleanup helper)
 */
export async function deleteOldReadNotifications(
  userId: string,
  olderThanDays: number = 30
): Promise<number> {
  const notificationsRef = collection(db, 'users', userId, 'notifications')
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
  
  const q = query(
    notificationsRef,
    where('isRead', '==', true),
    where('readAt', '<', Timestamp.fromDate(cutoffDate))
  )
  
  const snapshot = await getDocs(q)
  
  if (snapshot.empty) return 0
  
  const batch = writeBatch(db)
  snapshot.docs.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref)
  })
  
  await batch.commit()
  return snapshot.size
}
