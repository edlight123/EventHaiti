'use client'

import { useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import type { UserProfile } from '@/lib/firestore/user-profile'

interface NotificationsCardProps {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>
}

export function NotificationsCard({ profile, onUpdate }: NotificationsCardProps) {
  const [notify, setNotify] = useState(profile.notify || {
    reminders: true,
    updates: true,
    promos: false
  })
  const [isUpdating, setIsUpdating] = useState(false)

  const handleToggle = async (key: 'reminders' | 'updates' | 'promos') => {
    const newNotify = { ...notify, [key]: !notify[key] }
    setNotify(newNotify)
    setIsUpdating(true)
    try {
      await onUpdate({ notify: newNotify })
    } catch (error) {
      console.error('Failed to update notifications:', error)
      // Revert on error
      setNotify(notify)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Notifications</h2>
          <p className="text-sm text-gray-600">Manage how you hear from us</p>
        </div>
      </div>

      {/* Notification Toggles */}
      <div className="space-y-4">
        {/* Event Reminders */}
        <div className="flex items-start justify-between py-3 border-b border-gray-100">
          <div className="flex-1 pr-4">
            <h3 className="font-semibold text-gray-900 mb-1">Event Reminders</h3>
            <p className="text-sm text-gray-600">
              Get notified before events you&apos;re attending
            </p>
          </div>
          <button
            onClick={() => handleToggle('reminders')}
            disabled={isUpdating}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 ${
              notify.reminders ? 'bg-teal-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notify.reminders ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Event Updates */}
        <div className="flex items-start justify-between py-3 border-b border-gray-100">
          <div className="flex-1 pr-4">
            <h3 className="font-semibold text-gray-900 mb-1">Event Updates</h3>
            <p className="text-sm text-gray-600">
              Changes to events you&apos;re attending or following
            </p>
          </div>
          <button
            onClick={() => handleToggle('updates')}
            disabled={isUpdating}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 ${
              notify.updates ? 'bg-teal-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notify.updates ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Promotions */}
        <div className="flex items-start justify-between py-3">
          <div className="flex-1 pr-4">
            <h3 className="font-semibold text-gray-900 mb-1">Promotions & News</h3>
            <p className="text-sm text-gray-600">
              Special offers, featured events, and platform updates
            </p>
          </div>
          <button
            onClick={() => handleToggle('promos')}
            disabled={isUpdating}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 ${
              notify.promos ? 'bg-teal-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notify.promos ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> Important account and security notifications will always be sent regardless of these settings.
        </p>
      </div>
    </div>
  )
}
