import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs,
  query,
  where,
  Timestamp
} from 'firebase/firestore'
import { getMessaging, getToken, deleteToken, Messaging } from 'firebase/messaging'
import { db } from './firebase/client'
import type { FCMToken } from '@/types/notifications'

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

/**
 * Request FCM permission and get token
 * Only call this after explicit user action (button click)
 */
export async function requestNotificationPermission(userId: string): Promise<{
  success: boolean
  token?: string
  error?: string
}> {
  try {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      return { success: false, error: 'Notifications not supported in this browser' }
    }

    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      return { success: false, error: 'Service worker not supported' }
    }

    // Request permission
    const permission = await Notification.requestPermission()
    
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission denied' }
    }

    // Get FCM token
    const messaging = getMessaging()
    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    
    if (!token) {
      return { success: false, error: 'Failed to get FCM token' }
    }

    // Save token to Firestore
    await saveFCMToken(userId, token)
    
    return { success: true, token }
  } catch (error: any) {
    console.error('Error requesting notification permission:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Save FCM token to Firestore
 */
export async function saveFCMToken(userId: string, token: string): Promise<void> {
  const tokenRef = doc(db, 'users', userId, 'fcmTokens', token)
  
  const tokenData: Omit<FCMToken, 'token'> = {
    createdAt: Timestamp.now() as any,
    lastUsed: Timestamp.now() as any,
    deviceInfo: {
      userAgent: navigator.userAgent,
      platform: navigator.platform
    }
  }
  
  await setDoc(tokenRef, tokenData, { merge: true })
}

/**
 * Delete FCM token from Firestore and FCM
 */
export async function deleteFCMToken(userId: string, token?: string): Promise<void> {
  try {
    const messaging = getMessaging()
    
    // If no token provided, delete current token
    if (!token) {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY })
      token = currentToken
    }
    
    if (token) {
      // Delete from FCM
      await deleteToken(messaging)
      
      // Delete from Firestore
      const tokenRef = doc(db, 'users', userId, 'fcmTokens', token)
      await deleteDoc(tokenRef)
    }
  } catch (error) {
    console.error('Error deleting FCM token:', error)
  }
}

/**
 * Get all FCM tokens for a user
 */
export async function getUserFCMTokens(userId: string): Promise<string[]> {
  const tokensRef = collection(db, 'users', userId, 'fcmTokens')
  const snapshot = await getDocs(tokensRef)
  
  return snapshot.docs.map(doc => doc.id)
}

/**
 * Clean up old/invalid FCM tokens
 */
export async function cleanupOldTokens(userId: string, olderThanDays: number = 90): Promise<number> {
  const tokensRef = collection(db, 'users', userId, 'fcmTokens')
  const snapshot = await getDocs(tokensRef)
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
  
  let deletedCount = 0
  
  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data()
    const lastUsed = data.lastUsed?.toDate()
    
    if (lastUsed && lastUsed < cutoffDate) {
      await deleteDoc(docSnapshot.ref)
      deletedCount++
    }
  }
  
  return deletedCount
}

/**
 * Check if user has granted notification permission
 */
export function hasNotificationPermission(): boolean {
  if (!('Notification' in window)) {
    return false
  }
  
  return Notification.permission === 'granted'
}

/**
 * Check if user can be prompted for notifications
 * (hasn't explicitly denied)
 */
export function canRequestNotificationPermission(): boolean {
  if (!('Notification' in window)) {
    return false
  }
  
  return Notification.permission === 'default'
}
