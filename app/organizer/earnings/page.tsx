import { redirect } from 'next/navigation'
import { adminAuth } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'
import { getOrganizerEarningsSummary } from '@/lib/earnings'
import EarningsView from './EarningsView'

export const metadata = {
  title: 'Earnings | EventHaiti',
  description: 'View your event earnings and manage payouts',
}

export default async function EarningsPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (!sessionCookie) {
    redirect('/auth/login')
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const organizerId = decodedClaims.uid

    const summary = await getOrganizerEarningsSummary(organizerId)

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Earnings</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              Track your event revenue and manage payouts
            </p>
          </div>

          <EarningsView summary={summary} organizerId={organizerId} />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading earnings:', error)
    redirect('/auth/login')
  }
}
