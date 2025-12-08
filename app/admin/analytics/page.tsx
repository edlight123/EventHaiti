import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import {
  getUserGrowthMetrics,
  getRevenueGrowthMetrics,
  getTopPerformingEvents,
  getCategoryPopularity,
  getOrganizerRankings,
} from '@/lib/admin-analytics'
import { AdminRevenueAnalytics } from '@/components/admin/AdminRevenueAnalytics'

export const revalidate = 120 // Cache for 2 minutes

export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser()

  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(e => e)

  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    redirect('/')
  }

  const supabase = await createClient()

  // Fetch data for analytics
  const { data: users } = await supabase.from('users').select('*')
  const { data: events } = await supabase.from('events').select('*')
  const { data: tickets } = await supabase.from('tickets').select('*')

  const allUsers = users || []
  const allEvents = events || []
  const allTickets = tickets || []

  // Calculate metrics
  const totalRevenue = allTickets
    .filter((t: any) => t.status === 'confirmed')
    .reduce((sum: number, t: any) => sum + (t.price_paid || 0), 0)

  const upcomingEvents = allEvents.filter((e: any) => 
    e.start_datetime && new Date(e.start_datetime) > new Date()
  ).length

  const pastEvents = allEvents.filter((e: any) => 
    e.start_datetime && new Date(e.start_datetime) <= new Date()
  ).length

  const verifiedOrganizers = allUsers.filter((u: any) => u.is_verified).length
  const totalOrganizers = allUsers.filter((u: any) => u.role === 'organizer').length

  const averageTicketPrice = allTickets.length > 0
    ? allTickets.reduce((sum: number, t: any) => sum + (t.price_paid || 0), 0) / allTickets.length
    : 0

  // Events by month (last 6 months)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const recentEvents = allEvents.filter((e: any) => 
    e.created_at && new Date(e.created_at) >= sixMonthsAgo
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={true} />

      
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="mb-4 sm:mb-6">
          <Link href="/admin" className="text-teal-600 hover:text-teal-700 text-[13px] sm:text-sm font-medium">
            ← Back to Admin Dashboard
          </Link>
        </div>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-[13px] sm:text-base text-gray-600 mt-1 sm:mt-2">Platform insights and performance metrics</p>
        </div>

        {/* Multi-Currency Revenue Analytics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue Analytics (Multi-Currency)</h2>
          <AdminRevenueAnalytics />
        </div>

        <div className="border-t border-gray-200 my-8"></div>

        {/* Key Metrics */}
        <div className="flex overflow-x-auto gap-3 sm:gap-6 mb-6 sm:mb-8 pb-2 snap-x snap-mandatory lg:grid lg:grid-cols-4 scrollbar-hide">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[200px] snap-start flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Total Revenue</div>
                <div className="text-2xl sm:text-3xl font-bold text-teal-600 mt-1 sm:mt-2">
                  ${totalRevenue.toLocaleString()}
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[200px] snap-start flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Tickets Sold</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
                  {allTickets.length.toLocaleString()}
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[200px] snap-start flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Avg Ticket Price</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
                  ${averageTicketPrice.toFixed(2)}
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[200px] snap-start flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Verified Organizers</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
                  {verifiedOrganizers}/{totalOrganizers}
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Event Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Event Overview</h2>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] sm:text-base text-gray-600">Total Events</span>
                <span className="text-xl sm:text-2xl font-bold text-gray-900">{allEvents.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] sm:text-base text-gray-600">Upcoming Events</span>
                <span className="text-xl sm:text-2xl font-bold text-green-600">{upcomingEvents}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] sm:text-base text-gray-600">Past Events</span>
                <span className="text-xl sm:text-2xl font-bold text-gray-500">{pastEvents}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] sm:text-base text-gray-600">Events (Last 6 Months)</span>
                <span className="text-xl sm:text-2xl font-bold text-teal-600">{recentEvents.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">User Overview</h2>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] sm:text-base text-gray-600">Total Users</span>
                <span className="text-xl sm:text-2xl font-bold text-gray-900">{allUsers.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] sm:text-base text-gray-600">Organizers</span>
                <span className="text-xl sm:text-2xl font-bold text-purple-600">{totalOrganizers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] sm:text-base text-gray-600">Attendees</span>
                <span className="text-xl sm:text-2xl font-bold text-blue-600">
                  {allUsers.filter((u: any) => u.role !== 'organizer').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] sm:text-base text-gray-600">Verification Rate</span>
                <span className="text-xl sm:text-2xl font-bold text-green-600">
                  {totalOrganizers > 0 ? Math.round((verifiedOrganizers / totalOrganizers) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl border-2 border-teal-200 p-6 sm:p-8 text-center">
          <h3 className="text-xl sm:text-2xl font-bold text-teal-900 mb-1 sm:mb-2">Platform Health</h3>
          <p className="text-[13px] sm:text-base text-teal-700 mb-4">
            Your event platform is growing! Keep monitoring these metrics to ensure success.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
            <div className="bg-white rounded-lg p-3 sm:p-4">
              <div className="text-[11px] sm:text-xs text-gray-600">Events/Organizer</div>
              <div className="text-lg sm:text-xl font-bold text-gray-900 mt-0.5 sm:mt-1">
                {totalOrganizers > 0 ? (allEvents.length / totalOrganizers).toFixed(1) : '0'}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4">
              <div className="text-[11px] sm:text-xs text-gray-600">Tickets/Event</div>
              <div className="text-lg sm:text-xl font-bold text-gray-900 mt-0.5 sm:mt-1">
                {allEvents.length > 0 ? (allTickets.length / allEvents.length).toFixed(1) : '0'}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4">
              <div className="text-[11px] sm:text-xs text-gray-600">Revenue/Event</div>
              <div className="text-lg sm:text-xl font-bold text-gray-900 mt-0.5 sm:mt-1">
                ${allEvents.length > 0 ? (totalRevenue / allEvents.length).toFixed(0) : '0'}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4">
              <div className="text-[11px] sm:text-xs text-gray-600">Revenue/Ticket</div>
              <div className="text-lg sm:text-xl font-bold text-gray-900 mt-0.5 sm:mt-1">
                ${allTickets.length > 0 ? (totalRevenue / allTickets.length).toFixed(2) : '0'}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <MobileNavWrapper user={user} />
    </div>
  )
}
