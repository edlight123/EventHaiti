import type { NotificationType } from './database'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  eventId?: string
  ticketId?: string
  isRead: boolean
  createdAt: Date
  readAt?: Date
}

export interface FCMToken {
  token: string
  createdAt: Date
  lastUsed: Date
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
