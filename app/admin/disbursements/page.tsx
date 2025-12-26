import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { getEndedEventsForDisbursement, getDisbursementStats } from '@/lib/admin/disbursement-tracking'
import { AdminDisbursementDashboard } from '@/components/admin/AdminDisbursementDashboard'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import WithdrawalsView from '@/app/admin/withdrawals/WithdrawalsView'

export const metadata = {
  title: 'Payout Operations | Admin | EventHaiti',
  description: 'Manage event disbursements and organizer withdrawals',
}

export const revalidate = 60 // Refresh every minute

export default async function AdminDisbursementsPage() {
  const user = await getCurrentUser()

  if (!user || !isAdmin(user.email)) {
    redirect('/auth/login?redirect=/admin/disbursements')
  }

  const [endedEvents, stats] = await Promise.all([
    getEndedEventsForDisbursement(30), // Last 30 days
    getDisbursementStats()
  ])

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={true} />
      
      <div id="disbursements" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payout Operations</h1>
          <p className="mt-2 text-gray-600">
            Manage event disbursements and organizer withdrawals
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Event Disbursements</h2>
          <p className="mt-2 text-gray-600">
            Track events that have ended and process organizer payouts
          </p>
        </div>

        <AdminDisbursementDashboard endedEvents={endedEvents} stats={stats} />
      </div>

      <div id="withdrawals">
        <WithdrawalsView />
      </div>

      <MobileNavWrapper user={user} isAdmin={true} />
    </div>
  )
}
