import { db } from '../config/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { Notification } from '../types/notifications';

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  limitCount: number = 50
): Promise<Notification[]> {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(
      notificationsRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const notifications: Notification[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        eventId: data.eventId,
        ticketId: data.ticketId,
        isRead: data.isRead ?? false,
        readAt: data.readAt?.toDate?.()?.toISOString() || data.readAt,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      });
    });

    return notifications;
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(
      notificationsRef,
      where('isRead', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(userId: string, notificationId: string): Promise<void> {
  try {
    const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      isRead: true,
      readAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(
      notificationsRef,
      where('isRead', '==', false)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.forEach((document) => {
      batch.update(document.ref, {
        isRead: true,
        readAt: new Date().toISOString(),
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking all as read:', error);
    throw error;
  }
}

/**
 * Delete all notifications for a user.
 *
 * Note: Firestore batches are limited (500 ops). We loop in chunks.
 */
export async function clearAllNotifications(userId: string): Promise<number> {
  const notificationsRef = collection(db, 'users', userId, 'notifications');
  let deleted = 0;

  try {
    // Keep deleting until the collection is empty.
    // Use a chunk size safely below 500 to leave room for any future ops.
    const CHUNK_SIZE = 450;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const q = query(notificationsRef, limit(CHUNK_SIZE));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        break;
      }

      const batch = writeBatch(db);
      snapshot.forEach((document) => {
        batch.delete(document.ref);
        deleted += 1;
      });

      await batch.commit();
    }

    return deleted;
  } catch (error) {
    console.error('Error clearing all notifications:', error);
    throw error;
  }
}
