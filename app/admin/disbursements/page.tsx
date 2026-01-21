import { getEndedEventsForDisbursement, getDisbursementStats } from '@/lib/admin/disbursement-tracking'
import { AdminDisbursementDashboard } from '@/components/admin/AdminDisbursementDashboard'
import WithdrawalsView from '@/app/admin/withdrawals/WithdrawalsView'

export const metadata = {
  title: 'Payout Operations | Admin | EventHaiti',
  description: 'Manage event disbursements and organizer withdrawals',
}

export const revalidate = 60
export const dynamic = 'force-dynamic'

export default async function AdminDisbursementsPage() {
  const [endedEvents, stats] = await Promise.all([
    getEndedEventsForDisbursement(365, 500),
    getDisbursementStats()
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Payout Operations</h1>
      </div>

      <div id="disbursements" className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900">Event Disbursements</h2>
        <div className="mt-4">
          <AdminDisbursementDashboard endedEvents={endedEvents} stats={stats} />
        </div>
      </div>

      <div id="withdrawals" className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Withdrawals</h2>
        <div className="mt-4">
          <WithdrawalsView embedded={true} showHeader={false} />
        </div>
      </div>
    </div>
  )
}
