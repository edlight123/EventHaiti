import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PullToRefresh from '@/components/PullToRefresh'
import { redirect } from 'next/navigation'
import { User, Mail, Phone, Shield, Bell, Lock, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'

export const revalidate = 0

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} />

      <PullToRefresh onRefresh={async () => {
        'use server'
        const { revalidatePath } = await import('next/cache')
        revalidatePath('/settings')
      }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        
          {/* Back Button */}
          <Link 
            href="/profile"
            className="inline-flex items-center gap-1.5 md:gap-2 text-gray-600 hover:text-gray-900 mb-4 md:mb-6 transition-colors text-[13px] md:text-base"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back to Profile</span>
          </Link>

          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Account Settings</h1>
            <p className="text-[13px] md:text-base text-gray-600 mt-1 md:mt-2">Manage your account preferences and settings</p>
          </div>

          {/* Settings Sections */}
          <div className="space-y-4 md:space-y-6">
          
          {/* Personal Information */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-soft border border-gray-100 p-4 md:p-6">
            <div className="flex items-center gap-2.5 md:gap-3 mb-4 md:mb-6">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 md:w-5 md:h-5 text-brand-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg md:text-xl font-bold text-gray-900">Personal Information</h2>
                <p className="text-[13px] md:text-sm text-gray-600">Update your personal details</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-gray-900 font-medium">{user.full_name}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-gray-900 font-medium">{user.email}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-gray-900 font-medium">{user.phone_number || 'Not provided'}</p>
                </div>
              </div>

              <div className="pt-4">
                <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <strong className="text-blue-900">Note:</strong> To update your personal information, please contact support or use your account provider settings.
                </p>
              </div>
            </div>
          </div>

          {/* Account Security */}
          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Account Security</h2>
                <p className="text-sm text-gray-600">Manage your account security settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Verification Status</label>
                <div className="flex items-center gap-3">
                  {user.is_verified ? (
                    <Badge variant="success" size="lg" icon={<Shield className="w-5 h-5" />}>
                      Verified Account
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Badge variant="warning" size="lg">
                        Not Verified
                      </Badge>
                      {user.role === 'organizer' && (
                        <Link
                          href="/organizer/verify"
                          className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors text-sm"
                        >
                          Get Verified
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                <Badge variant={user.role === 'organizer' ? 'vip' : 'primary'} size="lg">
                  {user.role === 'organizer' ? 'Event Organizer' : 'Event Attendee'}
                </Badge>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <Link
                  href="/api/auth/logout"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  Change Password
                </Link>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                <p className="text-sm text-gray-600">Manage how you receive notifications</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-semibold text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-600">Receive updates about your events and tickets</p>
                </div>
                <div className="text-sm font-medium text-gray-500">Enabled</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-semibold text-gray-900">Event Reminders</p>
                  <p className="text-sm text-gray-600">Get reminded about upcoming events</p>
                </div>
                <div className="text-sm font-medium text-gray-500">Enabled</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-semibold text-gray-900">Marketing Communications</p>
                  <p className="text-sm text-gray-600">Receive news and promotions</p>
                </div>
                <div className="text-sm font-medium text-gray-500">Enabled</div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl shadow-soft border border-red-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Danger Zone</h2>
                <p className="text-sm text-gray-600">Irreversible actions</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="font-semibold text-red-900 mb-2">Delete Account</p>
                <p className="text-sm text-red-700 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                  disabled
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Account (Contact Support)
                </button>
              </div>
            </div>
          </div>

        </div>
      </PullToRefresh>

      <MobileNavWrapper user={user} />
    </div>
  )
}
