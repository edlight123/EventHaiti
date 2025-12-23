import type { NotificationType } from './database'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
  eventId?: string
  ticketId?: string
  metadata?: Record<string, any>
  isRead: boolean
  createdAt: string
  readAt?: string
}

export interface FCMToken {
  token: string
  createdAt: string
  lastUsed: string
  deviceInfo?: {
    userAgent: string
    platform: string
  }
}

export interface NotificationPreferences {
  notifyTicketPurchase: boolean
  notifyEventUpdates: boolean
  notifyReminders: boolean
}
