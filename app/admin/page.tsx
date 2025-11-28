import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PullToRefresh from '@/components/PullToRefresh'
import { isAdmin, getAdminEmails } from '@/lib/admin'

export const revalidate = 0

const ADMIN_EMAILS = getAdminEmails()

export default async function AdminDashboard() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      redirect('/auth/login?redirect=/admin')
    }

    if (!ADMIN_EMAILS.includes(user.email || '')) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-mobile-nav">
          <div className="max-w-md w-full bg-white rounded-xl md:rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 text-center mx-4">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-[13px] md:text-base text-gray-600 mb-4">
              You don&apos;t have admin privileges for this platform.
            </p>
            <div className="bg-gray-50 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
              <p className="text-[13px] md:text-sm text-gray-700">
                <strong>Your email:</strong> {user.email}
              </p>
              <p className="text-[11px] md:text-xs text-gray-500 mt-2">
                Contact an administrator to request access.
              </p>
            </div>
            <a
              href="/"
              className="inline-block bg-teal-600 text-white px-5 md:px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors text-sm md:text-base"
            >
              Return to Home
            </a>
          </div>
          <MobileNavWrapper user={user} />
        </div>
      )
    }

  const supabase = await createClient()

  // Fetch platform statistics with error handling for each query
  let totalUsers = 0
  let totalEvents = 0
  let totalTickets = 0
  let revenue = 0
  let pendingVerifications = 0
  let recentEvents: any[] = []

  try {
    const usersResult = await supabase.from('users').select('id')
    totalUsers = usersResult.data?.length || 0
  } catch (e) {
    console.error('Error fetching users:', e)
  }

  try {
    const eventsResult = await supabase.from('events').select('id')
    totalEvents = eventsResult.data?.length || 0
  } catch (e) {
    console.error('Error fetching events:', e)
  }

  try {
    const ticketsResult = await supabase.from('tickets').select('id, price_paid, status')
    totalTickets = ticketsResult.data?.length || 0
    revenue = ticketsResult.data
      ?.filter((t: any) => t.status === 'confirmed')
      ?.reduce((sum: number, t: any) => sum + (t.price_paid || 0), 0) || 0
  } catch (e) {
    console.error('Error fetching tickets:', e)
  }

  try {
    const verificationResult = await supabase
      .from('verification_requests')
      .select('id, status')
    pendingVerifications = verificationResult.data?.filter((r: any) => r.status === 'pending').length || 0
  } catch (e) {
    console.error('Error fetching verifications:', e)
  }

  try {
    const eventsResult = await supabase
      .from('events')
      .select('id, title, start_datetime, ticket_price, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    recentEvents = eventsResult.data || []
  } catch (e) {
    console.error('Error fetching recent events:', e)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={true} />

      <PullToRefresh onRefresh={async () => {
        'use server'
        const { revalidatePath } = await import('next/cache')
        revalidatePath('/admin')
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-[13px] md:text-base text-gray-600 mt-1 md:mt-2">Platform overview and management</p>
          </div>

          {/* Stats Grid - horizontal scroll on mobile */}
          <div className="flex md:grid md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6 overflow-x-auto -mx-4 px-4 pb-2 snap-x snap-mandatory md:overflow-visible mb-6 md:mb-8">
          <div className="min-w-[180px] md:min-w-0 snap-start bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 flex-shrink-0">
            <div className="text-[11px] md:text-sm font-medium text-gray-600 uppercase tracking-wide">Total Users</div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mt-1.5 md:mt-2">{totalUsers.toLocaleString()}</div>
          </div>

          <div className="min-w-[180px] md:min-w-0 snap-start bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 flex-shrink-0">
            <div className="text-[11px] md:text-sm font-medium text-gray-600 uppercase tracking-wide">Total Events</div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mt-1.5 md:mt-2">{totalEvents.toLocaleString()}</div>
          </div>

          <div className="min-w-[180px] md:min-w-0 snap-start bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 flex-shrink-0">
            <div className="text-[11px] md:text-sm font-medium text-gray-600 uppercase tracking-wide">Tickets Sold</div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mt-1.5 md:mt-2">{totalTickets.toLocaleString()}</div>
          </div>

          <div className="min-w-[180px] md:min-w-0 snap-start bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 flex-shrink-0">
            <div className="text-[11px] md:text-sm font-medium text-gray-600 uppercase tracking-wide">Total Revenue</div>
            <div className="text-2xl md:text-3xl font-bold text-teal-600 mt-1.5 md:mt-2">${revenue.toLocaleString()}</div>
          </div>

          <a
            href="/admin/verify"
            className="min-w-[180px] md:min-w-0 snap-start bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg md:rounded-xl shadow-sm border-2 border-yellow-400 p-4 md:p-6 hover:border-yellow-500 transition-all hover:shadow-md flex-shrink-0"
          >
            <div className="text-[11px] md:text-sm font-medium text-yellow-800 uppercase tracking-wide">Pending Verifications</div>
            <div className="text-2xl md:text-3xl font-bold text-yellow-900 mt-1.5 md:mt-2">{pendingVerifications}</div>
            {pendingVerifications > 0 && (
              <div className="text-[10px] md:text-xs text-yellow-700 mt-1.5 md:mt-2 font-medium">→ Click to Review</div>
            )}
          </a>
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-xl md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6 md:mb-8">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">Recent Events</h2>
          {recentEvents.length === 0 ? (
            <p className="text-gray-500 text-center py-6 md:py-8 text-[13px] md:text-base">No events yet</p>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-3 md:px-4 py-2.5 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase">Event</th>
                    <th className="px-3 md:px-4 py-2.5 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Date</th>
                    <th className="px-3 md:px-4 py-2.5 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Price</th>
                    <th className="px-3 md:px-4 py-2.5 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentEvents.map((event: any) => (
                    <tr key={event.id}>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 text-[13px] md:text-sm text-gray-900 truncate max-w-[200px]">{event.title || 'Untitled'}</td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 text-[13px] md:text-sm text-gray-600 hidden sm:table-cell whitespace-nowrap">
                        {event.start_datetime ? new Date(event.start_datetime).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 text-[13px] md:text-sm text-gray-600 hidden md:table-cell">
                        ${(event.ticket_price || 0).toFixed(2)}
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 text-[13px] md:text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${
                          event.start_datetime && new Date(event.start_datetime) > new Date()
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {event.start_datetime && new Date(event.start_datetime) > new Date() ? 'Upcoming' : 'Past'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <a
            href="/admin/verify"
            className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 hover:border-teal-600 transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">Verify Organizers</h3>
              {pendingVerifications > 0 && (
                <span className="bg-yellow-500 text-white text-[10px] md:text-xs font-bold px-2 py-0.5 md:py-1 rounded-full">
                  {pendingVerifications}
                </span>
              )}
            </div>
            <p className="text-gray-600 text-[13px] md:text-sm">Review identity verification requests</p>
          </a>

          <a
            href="/admin/events"
            className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 hover:border-teal-600 transition-colors"
          >
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">Manage Events</h3>
            <p className="text-gray-600 text-[13px] md:text-sm">Review and moderate events</p>
          </a>

          <a
            href="/admin/users"
            className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 hover:border-teal-600 transition-colors"
          >
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">Manage Users</h3>
            <p className="text-gray-600 text-[13px] md:text-sm">View and moderate user accounts</p>
          </a>

          <a
            href="/admin/analytics"
            className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 hover:border-teal-600 transition-colors"
          >
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">Analytics</h3>
            <p className="text-gray-600 text-[13px] md:text-sm">Platform insights and reports</p>
          </a>
        </div>
      </PullToRefresh>

      <MobileNavWrapper user={user} />
    </div>
  )
  } catch (error) {
    console.error('Admin dashboard fatal error:', error)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h1>
          <p className="text-gray-600 mb-6">
            There was an error loading the admin dashboard. This may be a configuration issue.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-500">
              Error: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
          <a
            href="/"
            className="inline-block bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
          >
            Return to Home
          </a>
        </div>
      </div>
    )
  }
}
