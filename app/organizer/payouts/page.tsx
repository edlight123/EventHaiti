import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { getOrganizerBalance, getPayoutHistory } from '@/lib/firestore/payout'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
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
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payouts</h1>
          <p className="mt-2 text-sm md:text-base text-gray-600">
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
      
      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
