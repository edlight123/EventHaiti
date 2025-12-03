'use client'

import React, { useEffect, useState } from 'react'
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  getUserNotifications, 
  markAsRead, 
  markAllAsRead,
  getUnreadCount 
} from '@/lib/notifications'
import type { Notification } from '@/types/notifications'

interface NotificationsClientProps {
  userId: string
  initialNotifications: Notification[]
  initialUnreadCount: number
}

export function NotificationsClient({ 
  userId, 
  initialNotifications,
  initialUnreadCount 
}: NotificationsClientProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [isLoading, setIsLoading] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(userId, notificationId)
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    setIsLoading(true)
    try {
      await markAllAsRead(userId)
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true, readAt: new Date() }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all notifications? This cannot be undone.')) {
      return
    }

    setIsClearing(true)
    try {
      const response = await fetch('/api/notifications/clear-all', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to clear notifications')
      }

      // Clear local state
      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      console.error('Error clearing notifications:', error)
      alert('Failed to clear notifications. Please try again.')
    } finally {
      setIsClearing(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ticket_purchased':
        return '🎫'
      case 'event_updated':
        return '📢'
      case 'event_reminder_24h':
      case 'event_reminder_3h':
      case 'event_reminder_30min':
        return '⏰'
      case 'event_cancelled':
        return '❌'
      default:
        return '🔔'
    }
  }

  const getNotificationLink = (notification: Notification): string => {
    if (notification.ticketId) {
      return `/tickets/${notification.ticketId}`
    }
    if (notification.eventId) {
      return `/events/${notification.eventId}`
    }
    return '#'
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id)
    }

    const link = getNotificationLink(notification)
    if (link !== '#') {
      router.push(link)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notifications</h1>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors disabled:opacity-50"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  disabled={isClearing}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear all</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-gray-600">
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'You\'re all caught up!'}
          </p>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications yet</h3>
            <p className="text-gray-600">
              When you get notifications, they&apos;ll show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`
                  bg-white rounded-lg shadow-sm p-4 cursor-pointer transition-all hover:shadow-md
                  ${!notification.isRead ? 'border-l-4 border-brand-500' : 'border-l-4 border-transparent'}
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 text-2xl">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <div className="flex-shrink-0 w-2 h-2 bg-brand-500 rounded-full mt-1.5" />
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        {notification.createdAt.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                      
                      {getNotificationLink(notification) !== '#' && (
                        <span className="flex items-center gap-1 text-brand-600">
                          View details
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mark as read button */}
                  {!notification.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMarkAsRead(notification.id)
                      }}
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-brand-600 transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
