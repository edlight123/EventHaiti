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
import { AdminCommandBar } from '@/components/admin/AdminCommandBar'
import { KpiCard } from '@/components/admin/KpiCard'
import { WorkQueueCard } from '@/components/admin/WorkQueueCard'
import { RecentActivityTimeline } from '@/components/admin/RecentActivityTimeline'
import { Users, Calendar, Ticket, DollarSign, ShieldCheck, AlertCircle, RefreshCcw } from 'lucide-react'

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
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              You don&apos;t have admin privileges for this platform.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                <strong>Your email:</strong> {user.email}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Contact an administrator to request access.
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

  // Fetch platform statistics using Firestore
  const [platformCounts, metrics7d, recentEvents, pendingVerifications] = await Promise.all([
    getPlatformCounts(),
    get7DayMetrics(),
    getRecentEvents(5),
    getPendingVerifications(3)
  ])

  const { usersCount, eventsCount, ticketsCount, pendingVerifications: pendingCount } = platformCounts
  const { gmv7d, tickets7d, refunds7d, refundsAmount7d } = metrics7d

  return (
    <PullToRefresh onRefresh={refreshPage}>
      <div className="min-h-screen bg-gray-50 pb-mobile-nav">
        <Navbar user={user} isAdmin={true} />
        
        {/* Command Bar */}
        <AdminCommandBar pendingVerifications={pendingCount} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Platform operations & analytics</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <KpiCard
            title="Total Users"
            value={usersCount}
            icon={Users}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
            href="/admin/users"
          />
          
          <KpiCard
            title="Total Events"
            value={eventsCount}
            icon={Calendar}
            iconColor="text-purple-600"
            iconBg="bg-purple-50"
            href="/admin/events"
          />
          
          <KpiCard
            title="Tickets (7d)"
            value={tickets7d}
            subtitle="Last 7 days"
            icon={Ticket}
            iconColor="text-teal-600"
            iconBg="bg-teal-50"
          />
          
          <KpiCard
            title="GMV (7d)"
            value={`${gmv7d.toLocaleString()} HTG`}
            subtitle="Last 7 days"
            icon={DollarSign}
            iconColor="text-green-600"
            iconBg="bg-green-50"
          />
          
          <KpiCard
            title="Refunds (7d)"
            value={refunds7d}
            subtitle={`${refundsAmount7d.toLocaleString()} HTG`}
            icon={RefreshCcw}
            iconColor="text-orange-600"
            iconBg="bg-orange-50"
          />
          
          <KpiCard
            title="Pending Verifications"
            value={pendingCount}
            icon={ShieldCheck}
            iconColor="text-yellow-800"
            iconBg="bg-yellow-50"
            href="/admin/verify"
          />
        </div>

        {/* Work Queues Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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

        {/* Additional Info Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity Timeline */}
          <RecentActivityTimeline activities={[]} />

          {/* Notes Card */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-blue-900 mb-2">📊 Daily Statistics System</h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>
                    Metrics are calculated from <code className="bg-blue-100 px-1 rounded">platform_stats_daily</code> rollups for optimal performance.
                  </p>
                  <p className="font-medium">✅ Automated daily at 1:00 AM UTC:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>GMV from confirmed ticket sales</li>
                    <li>Total tickets sold</li>
                    <li>Refunds count and amount</li>
                  </ul>
                  <p className="font-medium mt-3">To backfill historical data:</p>
                  <code className="block bg-blue-100 px-2 py-1 rounded text-xs mt-1">
                    npm run backfill-stats
                  </code>
                  <p className="text-xs mt-3 text-blue-700">
                    📖 See <code>docs/DAILY_STATS_SYSTEM.md</code> for full documentation
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <MobileNavWrapper user={null} isAdmin={true} />
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
