import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PullToRefresh from '@/components/PullToRefresh'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { revalidatePath } from 'next/cache'
import { 
  getPlatformCounts, 
  get7DayMetrics, 
  getRecentEvents, 
  getPendingVerifications 
} from '@/lib/firestore/admin'
import { getRecentAdminActivities } from '@/lib/admin/audit-log'
import { AdminCommandBar } from '@/components/admin/AdminCommandBar'
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied'
import { AdminDashboardHeader } from '@/components/admin/AdminDashboardHeader'
import { AdminKpiGrid } from '@/components/admin/AdminKpiGrid'
import { WorkQueueCard } from '@/components/admin/WorkQueueCard'
import { RecentActivityTimeline } from '@/components/admin/RecentActivityTimeline'
import { ShieldCheck, AlertCircle, Calendar } from 'lucide-react'

export const revalidate = 0

export default async function AdminDashboard() {
  async function refreshPage() {
    'use server'
    revalidatePath('/admin')
  }

  try {
    const user = await getCurrentUser()

    if (!user) {
      redirect('/auth/login?redirect=/admin')
    }

    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(e => e)

    if (!ADMIN_EMAILS.includes(user.email || '')) {
      return <AdminAccessDenied userEmail={user.email} />
    }

  // Fetch platform statistics using Firestore
  const [platformCounts, metrics7d, recentEvents, pendingVerifications, recentActivities] = await Promise.all([
    getPlatformCounts(),
    get7DayMetrics(),
    getRecentEvents(5),
    getPendingVerifications(3),
    getRecentAdminActivities(10)
  ])

  const { usersCount, eventsCount, ticketsCount, pendingVerifications: pendingCount } = platformCounts
  const { gmv7d, tickets7d, refunds7d, refundsAmount7d } = metrics7d

  return (
    <PullToRefresh onRefresh={refreshPage}>
      <div className="min-h-screen bg-gray-50 pb-mobile-nav">
        <Navbar user={user} isAdmin={true} />
        
        {/* Command Bar */}
        <AdminCommandBar pendingVerifications={pendingCount} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <AdminDashboardHeader />

        {/* KPI Grid - Mobile optimized: 2 columns on mobile, more on larger screens */}
        <AdminKpiGrid
          usersCount={usersCount}
          eventsCount={eventsCount}
          tickets7d={tickets7d}
          gmv7d={gmv7d}
          refunds7d={refunds7d}
          refundsAmount7d={refundsAmount7d}
          pendingCount={pendingCount}
        />

        {/* Work Queues - Mobile: Stack vertically, Desktop: Side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Pending Verifications Queue */}
          <WorkQueueCard
            title="Pending Verifications"
            count={pendingCount}
            items={pendingVerifications.map((v: any) => ({
              id: v.id,
              title: v.businessName || 'Unknown Business',
              subtitle: v.idType || 'ID verification',
              timestamp: v.createdAt,
              badge: {
                label: 'Pending',
                variant: 'warning' as const
              }
            }))}
            icon={ShieldCheck}
            iconColor="text-yellow-700"
            iconBg="bg-yellow-50"
            viewAllHref="/admin/verify"
            emptyMessage="No pending verifications"
          />

          {/* Recent Events Queue */}
          <WorkQueueCard
            title="Recent Events"
            count={eventsCount}
            items={recentEvents.map((e: any) => {
              // Build location string - show city, commune, and venue if available
              const locationParts = []
              if (e.venueName) locationParts.push(e.venueName)
              if (e.commune) locationParts.push(e.commune)
              if (e.city) locationParts.push(e.city)
              const location = locationParts.length > 0 ? locationParts.join(', ') : 'Location TBD'
              
              // Format price with correct currency
              const currency = e.currency || 'HTG'
              const price = e.ticketPrice != null && e.ticketPrice > 0
                ? `${e.ticketPrice.toFixed(2)} ${currency}`
                : 'Free'
              
              return {
                id: e.id,
                title: e.title || 'Untitled Event',
                subtitle: `${location} • ${price}`,
                timestamp: e.createdAt,
                badge: e.isPublished ? {
                  label: 'Published',
                  variant: 'success' as const
                } : {
                  label: 'Draft',
                  variant: 'neutral' as const
                }
              }
            })}
            icon={Calendar}
            iconColor="text-purple-600"
            iconBg="bg-purple-50"
            viewAllHref="/admin/events"
            emptyMessage="No events created yet"
          />
        </div>

        {/* Additional Info - Mobile: Stack, Desktop: Side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Recent Activity Timeline */}
          <RecentActivityTimeline activities={recentActivities} />

          {/* Notes Card - Simplified for mobile */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-blue-900 mb-2 text-sm sm:text-base">📊 Daily Statistics</h3>
                <div className="text-xs sm:text-sm text-blue-800 space-y-2">
                  <p className="hidden sm:block">
                    Metrics are calculated from <code className="bg-blue-100 px-1 rounded">platform_stats_daily</code> rollups for optimal performance.
                  </p>
                  <p className="font-medium">✅ Updated daily at 1 AM UTC</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                    <li>GMV from ticket sales</li>
                    <li>Total tickets sold</li>
                    <li>Refunds tracking</li>
                  </ul>
                  <p className="text-xs text-blue-700 hidden sm:block mt-3">
                    📖 See <code>docs/DAILY_STATS_SYSTEM.md</code> for docs
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <MobileNavWrapper user={user} isAdmin={true} />
    </div>
    </PullToRefresh>
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
