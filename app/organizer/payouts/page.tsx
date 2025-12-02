import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getOrganizerBalance, getPayoutHistory } from '@/lib/firestore/payout'
import PayoutDashboard from './PayoutDashboard'

export const metadata = {
  title: 'Payouts | EventHaiti',
  description: 'Manage your organizer payouts and earnings',
}

export default async function PayoutsPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'organizer') {
    redirect('/auth/login')
  }

  // Fetch balance and history server-side
  const balance = await getOrganizerBalance(user.id)
  const payouts = await getPayoutHistory(user.id, 20)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payouts</h1>
          <p className="mt-2 text-gray-600">
            Manage your earnings and withdrawal requests
          </p>
        </div>

        {/* Client Component (handles interactions) */}
        <PayoutDashboard
          initialBalance={balance}
          initialPayouts={payouts}
          organizerId={user.id}
        />
      </div>
    </div>
  )
}
