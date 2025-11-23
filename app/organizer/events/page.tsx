import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'

export const revalidate = 0

export default async function OrganizerEventsPage() {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login')
  }

  let events: any[] = []
  let userData: any = null

  if (isDemoMode()) {
    // Use demo events
    events = DEMO_EVENTS
  } else {
    // Fetch real events from database
    try {
      const supabase = await createClient()
      
      console.log('=== FETCHING EVENTS ===')
      console.log('User ID:', user.id)
      console.log('Supabase client created:', !!supabase)
      
      // Fetch user data to check verification status
      const allUsers = await supabase.from('users').select('*')
      userData = allUsers.data?.find((u: any) => u.id === user.id)
      
      // Check for pending verification request
      if (userData && !userData.is_verified) {
        const { data: verificationRequest } = await supabase
          .from('verification_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        
        // Update userData with verification status from request if exists
        if (verificationRequest) {
          userData.verification_status = verificationRequest.status
        }
      }
      
      const result = await supabase
        .from('events')
        .select('*')
      
      console.log('Query result:', JSON.stringify(result, null, 2))
      
      if (result.error) {
        console.error('Error fetching events:', result.error)
      }
      
      // Filter for this organizer's events
      const allEvents = result.data || []
      events = allEvents.filter((e: any) => e.organizer_id === user.id)
      
      // Sort by start_datetime descending
      events.sort((a: any, b: any) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime())
      
      console.log('Events array length:', events.length)
      if (events.length > 0) {
        console.log('First event:', events[0])
      }
    } catch (error) {
      console.error('Exception fetching events:', error)
      events = []
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Verification Status Banner */}
        {!isDemoMode() && userData && !userData.is_verified && (
          <div className={`mb-6 rounded-lg p-4 border ${
            userData.verification_status === 'pending'
              ? 'bg-blue-50 border-blue-200'
              : userData.verification_status === 'rejected'
              ? 'bg-red-50 border-red-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {userData.verification_status === 'pending' ? (
                  <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                ) : userData.verification_status === 'rejected' ? (
                  <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium ${
                  userData.verification_status === 'pending'
                    ? 'text-blue-800'
                    : userData.verification_status === 'rejected'
                    ? 'text-red-800'
                    : 'text-yellow-800'
                }`}>
                  {userData.verification_status === 'pending'
                    ? 'Verification Pending'
                    : userData.verification_status === 'rejected'
                    ? 'Verification Rejected'
                    : 'Account Not Verified'}
                </h3>
                <div className={`mt-2 text-sm ${
                  userData.verification_status === 'pending'
                    ? 'text-blue-700'
                    : userData.verification_status === 'rejected'
                    ? 'text-red-700'
                    : 'text-yellow-700'
                }`}>
                  <p>
                    {userData.verification_status === 'pending'
                      ? 'Your verification is being reviewed. This usually takes 24-48 hours. You cannot create events until verified.'
                      : userData.verification_status === 'rejected'
                      ? 'Your verification was not approved. Please submit a new verification request with clearer photos.'
                      : 'You need to verify your identity before you can create events.'}
                  </p>
                </div>
                {userData.verification_status !== 'pending' && (
                  <div className="mt-4">
                    <Link
                      href="/organizer/verify"
                      className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${
                        userData.verification_status === 'rejected'
                          ? 'text-red-700 bg-red-100 hover:bg-red-200'
                          : 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200'
                      }`}
                    >
                      {userData.verification_status === 'rejected' ? 'Resubmit Verification' : 'Start Verification'}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">My Events</h1>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/organizer/analytics"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </Link>
            <Link
              href="/organizer/promo-codes"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Promo Codes
            </Link>
            <Link
              href="/organizer/scan"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Scan Tickets
            </Link>
            <Link
              href="/organizer/events/new"
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium"
            >
              + Create Event
            </Link>
          </div>
        </div>

        {events && events.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tickets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{event.title}</div>
                      <div className="text-sm text-gray-500">{event.category}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {format(new Date(event.start_datetime), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {event.city}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className="font-semibold">{event.tickets_sold || 0}</span> / {event.total_tickets || 0}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        event.is_published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {event.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium space-x-3">
                      <Link
                        href={`/organizer/events/${event.id}`}
                        className="text-teal-700 hover:text-teal-800"
                      >
                        View
                      </Link>
                      <Link
                        href={`/organizer/events/${event.id}/edit`}
                        className="text-blue-700 hover:text-blue-800"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No events yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first event to start selling tickets.
            </p>
            <Link
              href="/organizer/events/new"
              className="inline-block px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium"
            >
              Create Event
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
