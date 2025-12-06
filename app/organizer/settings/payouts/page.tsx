import { adminAuth } from '@/lib/firebase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getPayoutConfig, getPayoutHistory, getOrganizerBalance } from '@/lib/firestore/payout'
import { PayoutStatusHero } from '@/components/payout/PayoutStatusHero'
import { BalanceRow } from '@/components/payout/BalanceRow'
import { PayoutMethodCard } from '@/components/payout/PayoutMethodCard'
import { FeesAndRulesCard } from '@/components/payout/FeesAndRulesCard'
import { VerificationChecklist } from '@/components/payout/VerificationChecklist'
import { PayoutHistory } from '@/components/payout/PayoutHistory'
import PayoutSettingsHeader from '@/components/organizer/settings/PayoutSettingsHeader'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PayoutsSettingsPage() {
  // Verify authentication
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (!sessionCookie) {
    redirect('/login')
  }

  let authUser
  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    authUser = decodedClaims
  } catch (error) {
    console.error('Error verifying session:', error)
    redirect('/login')
  }

  // Fetch payout data
  const [config, balanceData, payouts] = await Promise.all([
    getPayoutConfig(authUser.uid),
    getOrganizerBalance(authUser.uid),
    getPayoutHistory(authUser.uid, 10),
  ])

  // Determine status for hero
  const status = config?.status || 'not_setup'
  const hasMethod = config?.method && (config.bankDetails || config.mobileMoneyDetails)

  // Refresh handler (must be a server action)
  async function refreshData() {
    'use server'
    // This will trigger revalidation since revalidate = 0
  }

  const navbarUser = {
    id: authUser.uid,
    email: authUser.email || '',
    full_name: authUser.name || authUser.email || '',
    role: 'organizer' as const,
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={navbarUser} />

      {/* Header */}
      <PayoutSettingsHeader />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-8">
          {/* Status Hero */}
          <PayoutStatusHero status={status} />

          {/* Balance Summary */}
          {hasMethod && (
            <BalanceRow
              availableBalance={balanceData.available}
              pendingBalance={balanceData.pending}
              nextPayoutDate={balanceData.nextPayoutDate}
            />
          )}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Payout Method & Verification */}
            <div className="lg:col-span-2 space-y-8">
              <PayoutMethodCard
                config={config}
                onUpdate={refreshData}
              />

              {hasMethod && <VerificationChecklist config={config} />}

              {hasMethod && <PayoutHistory payouts={payouts} />}
            </div>

            {/* Right Column - Fees & Rules */}
            <div className="lg:col-span-1">
              <FeesAndRulesCard />
            </div>
          </div>
        </div>
      </div>
      
      <MobileNavWrapper user={navbarUser} />
    </div>
  )
}
