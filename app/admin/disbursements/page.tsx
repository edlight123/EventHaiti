import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getEndedEventsForDisbursement, getDisbursementStats } from '@/lib/admin/disbursement-tracking'
import { AdminDisbursementDashboard } from '@/components/admin/AdminDisbursementDashboard'
import Navbar from '@/components/Navbar'

export const metadata = {
  title: 'Event Disbursements | Admin | EventHaiti',
  description: 'Track ended events and manage payouts',
}

export const revalidate = 60 // Refresh every minute

export default async function AdminDisbursementsPage() {
  const user = await getCurrentUser()

  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(e => e)

  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    redirect('/auth/login?redirect=/admin/disbursements')
  }

  const [endedEvents, stats] = await Promise.all([
    getEndedEventsForDisbursement(30), // Last 30 days
    getDisbursementStats()
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} isAdmin={true} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Event Disbursements</h1>
          <p className="mt-2 text-gray-600">
            Track events that have ended and process organizer payouts
          </p>
        </div>

        <AdminDisbursementDashboard 
          endedEvents={endedEvents}
          stats={stats}
        />
      </div>
    </div>
  )
}
