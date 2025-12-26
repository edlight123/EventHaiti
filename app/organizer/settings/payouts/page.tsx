import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getPayoutProfile } from '@/lib/firestore/payout-profiles'
import { serializeData } from '@/lib/utils/serialize'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PayoutsPageNew from './PayoutsPageNew'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PayoutsSettingsPage({
  searchParams,
}: {
  searchParams?: { stripe?: string }
}) {
  const stripeParam = typeof searchParams?.stripe === 'string' ? searchParams.stripe : undefined
  const payoutPath = `/organizer/settings/payouts${stripeParam ? `?stripe=${encodeURIComponent(stripeParam)}` : ''}`

  // Verify authentication
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (!sessionCookie) {
    redirect(`/auth/login?redirect=${encodeURIComponent(payoutPath)}`)
  }

  let authUser
  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    authUser = decodedClaims
  } catch (error) {
    console.error('Error verifying session:', error)
    redirect(`/auth/login?redirect=${encodeURIComponent(payoutPath)}`)
  }

  // Ensure this user is an organizer (attendees should go through the upgrade flow)
  try {
    const userDoc = await adminDb.collection('users').doc(authUser.uid).get()
    const role = userDoc.exists ? userDoc.data()?.role : null
    if (role !== 'organizer') {
      redirect(`/organizer?redirect=${encodeURIComponent(payoutPath)}`)
    }
  } catch (error) {
    console.error('Error checking user role:', error)
    redirect(`/organizer?redirect=${encodeURIComponent(payoutPath)}`)
  }

  // Fetch payout data
  const [haitiConfig, stripeConfig] = await Promise.all([
    getPayoutProfile(authUser.uid, 'haiti'),
    getPayoutProfile(authUser.uid, 'stripe_connect'),
  ])

  const navbarUser = {
    id: authUser.uid,
    email: authUser.email || '',
    full_name: authUser.name || authUser.email || '',
    role: 'organizer' as const,
  }

  // Serialize data
  const serializedHaitiConfig = serializeData(haitiConfig) || undefined
  const serializedStripeConfig = serializeData(stripeConfig) || undefined

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={navbarUser} />

      <PayoutsPageNew
        haitiConfig={serializedHaitiConfig}
        stripeConfig={serializedStripeConfig}
        showEarningsAndPayouts={false}
        organizerId={authUser.uid}
      />
      
      <MobileNavWrapper user={navbarUser} />
    </div>
  )
}
