import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function ProfilePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  const supabase = await createClient()

  // Fetch user stats
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id')
    .eq('user_id', user.id)

  const { data: events } = await supabase
    .from('events')
    .select('id')
    .eq('organizer_id', user.id)

  const ticketCount = tickets?.length || 0
  const eventCount = events?.length || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-8 py-12">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center">
                <span className="text-3xl font-bold text-orange-600">
                  {user.full_name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="text-white">
                <h1 className="text-3xl font-bold">{user.full_name}</h1>
                <p className="text-orange-100 mt-1">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-px bg-gray-200">
            <div className="bg-white px-8 py-6">
              <p className="text-sm text-gray-600">Events Attended</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{ticketCount}</p>
            </div>
            <div className="bg-white px-8 py-6">
              <p className="text-sm text-gray-600">Events Created</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{eventCount}</p>
            </div>
          </div>

          {/* Profile Info */}
          <div className="px-8 py-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Full Name</label>
                  <p className="mt-1 text-gray-900">{user.full_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Email</label>
                  <p className="mt-1 text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Phone Number</label>
                  <p className="mt-1 text-gray-900">{user.phone_number || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Role</label>
                  <p className="mt-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                      {user.role === 'organizer' ? 'Event Organizer' : 'Attendee'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/tickets"
                  className="flex items-center px-4 py-3 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition"
                >
                  <svg className="w-5 h-5 text-orange-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  <span className="font-medium text-gray-900">My Tickets</span>
                </Link>
                <Link
                  href="/favorites"
                  className="flex items-center px-4 py-3 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition"
                >
                  <svg className="w-5 h-5 text-orange-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="font-medium text-gray-900">My Favorites</span>
                </Link>
                {eventCount > 0 && (
                  <Link
                    href="/organizer/events"
                    className="flex items-center px-4 py-3 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition"
                  >
                    <svg className="w-5 h-5 text-orange-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium text-gray-900">My Events</span>
                  </Link>
                )}
                <Link
                  href="/organizer/events/new"
                  className="flex items-center px-4 py-3 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition"
                >
                  <svg className="w-5 h-5 text-orange-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="font-medium text-gray-900">Create Event</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
