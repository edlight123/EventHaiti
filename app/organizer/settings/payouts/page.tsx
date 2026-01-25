import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getPayoutProfile } from '@/lib/firestore/payout-profiles'
import { serializeData } from '@/lib/utils/serialize'
import { normalizeCountryCode } from '@/lib/payment-provider'
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
  let organizerDefaultCountry: string | undefined
  try {
    const userDoc = await adminDb.collection('users').doc(authUser.uid).get()
    const userData = userDoc.exists ? (userDoc.data() as any) : null
    const role = userData?.role || null
    if (role !== 'organizer') {
      redirect(`/organizer?redirect=${encodeURIComponent(payoutPath)}`)
    }

    const normalized = normalizeCountryCode(userData?.default_country || userData?.country)
    organizerDefaultCountry = normalized || undefined
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
    <div className="bg-gray-50">
      <PayoutsPageNew
        haitiConfig={serializedHaitiConfig}
        stripeConfig={serializedStripeConfig}
        showEarningsAndPayouts={false}
        organizerId={authUser.uid}
        organizerDefaultCountry={organizerDefaultCountry}
        initialActiveProfile={stripeParam ? 'stripe_connect' : undefined}
      />    </div>
  )
}
