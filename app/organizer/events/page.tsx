import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import Navbar from '@/components/Navbar'
import EmptyState from '@/components/EmptyState'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'
import { Calendar, Plus } from 'lucide-react'

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
      
      console.log('User data:', userData)
      console.log('Is verified:', userData?.is_verified)
      console.log('Verification status:', userData?.verification_status)
      
      // Check for pending verification request - simplified query without ordering
      // If is_verified is undefined or false, check for verification requests
      if (userData && userData.is_verified !== true && userData.verification_status !== 'approved') {
        const { data: verificationRequests } = await supabase
          .from('verification_requests')
          .select('*')
          .eq('user_id', user.id)
        
        // Sort in memory instead of in query to avoid index requirement
        const sortedRequests = verificationRequests?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        const verificationRequest = sortedRequests?.[0]
        
        console.log('Verification request:', verificationRequest)
        
        // Update userData with verification status from request if exists
        if (verificationRequest) {
          userData.verification_status = verificationRequest.status
          console.log('Updated verification status to:', verificationRequest.status)
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const ticketsSold = event.tickets_sold || 0
              const totalTickets = event.total_tickets || 0
              const salesPercentage = totalTickets > 0 ? (ticketsSold / totalTickets) * 100 : 0
              const isSoldOut = ticketsSold >= totalTickets && totalTickets > 0

              return (
                <div key={event.id} className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 group hover:-translate-y-2">
                  {/* Event Banner/Thumbnail */}
                  {event.banner_image_url ? (
                    <div className="h-48 bg-gray-200 overflow-hidden relative">
                      <img
                        src={event.banner_image_url}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      {isSoldOut && (
                        <div className="absolute top-3 right-3 bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                          SOLD OUT
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-teal-100 via-teal-50 to-orange-100 flex items-center justify-center relative">
                      <span className="text-5xl">🎉</span>
                      {isSoldOut && (
                        <div className="absolute top-3 right-3 bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                          SOLD OUT
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-6">
                    {/* Status Badge & Category */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-block px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 rounded-full border border-teal-200">
                        {event.category}
                      </span>
                      <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-full ${
                        event.is_published
                          ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200'
                          : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {event.is_published ? '✓ Published' : '○ Draft'}
                      </span>
                    </div>

                    {/* Event Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-teal-700 transition-colors">
                      {event.title}
                    </h3>

                    {/* Event Details */}
                    <div className="space-y-3 mb-5">
                      <div className="flex items-center text-sm text-gray-700">
                        <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center mr-3">
                          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="font-medium">{format(new Date(event.start_datetime), 'MMM d, yyyy • h:mm a')}</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-700">
                        <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center mr-3">
                          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span className="font-medium">{event.city}</span>
                      </div>
                    </div>

                    {/* Ticket Sales Progress */}
                    <div className="mb-5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Ticket Sales</span>
                        <span className="text-sm font-bold text-gray-900">{ticketsSold} / {totalTickets}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-2.5 rounded-full transition-all duration-500 ${
                            salesPercentage >= 100 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                            salesPercentage >= 75 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                            salesPercentage >= 50 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                            'bg-gradient-to-r from-teal-500 to-teal-600'
                          }`}
                          style={{ width: `${Math.min(salesPercentage, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{salesPercentage.toFixed(0)}% sold</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Link
                        href={`/organizer/events/${event.id}`}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border-2 border-teal-200 transition-all duration-300 text-center"
                      >
                        View Details
                      </Link>
                      <Link
                        href={`/organizer/events/${event.id}/edit`}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 shadow-md hover:shadow-lg transition-all duration-300 text-center"
                      >
                        Edit Event
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="No events yet"
            description="Create your first event to start selling tickets and managing attendees."
            actionLabel="Create Event"
            actionHref="/organizer/events/new"
            actionIcon={Plus}
          />
        )}
      </div>
    </div>
  )
}
