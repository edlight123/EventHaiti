import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
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
import { AdminDashboardClient } from './AdminDashboardClient'

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
    
      <div className="min-h-screen bg-gray-50 pb-mobile-nav">
        <Navbar user={user} isAdmin={true} />
        
        {/* Command Bar */}
        <AdminCommandBar pendingVerifications={pendingCount} />

        <AdminDashboardClient
          usersCount={usersCount}
          eventsCount={eventsCount}
          tickets7d={tickets7d}
          gmv7d={gmv7d}
          refunds7d={refunds7d}
          refundsAmount7d={refundsAmount7d}
          pendingCount={pendingCount}
          pendingVerifications={pendingVerifications}
          recentEvents={recentEvents}
          recentActivities={recentActivities}
        />
      
      <MobileNavWrapper user={user} isAdmin={true} />
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
