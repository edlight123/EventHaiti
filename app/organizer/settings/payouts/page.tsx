import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getPayoutConfig } from '@/lib/firestore/payout'
import { serializeData } from '@/lib/utils/serialize'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PayoutsPageNew from './PayoutsPageNew'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getOrganizerEventSummaries(organizerId: string) {
  try {
    const earningsSnapshot = await adminDb
      .collection('event_earnings')
      .where('organizerId', '==', organizerId)
      .get()

    const summaries = await Promise.all(
      earningsSnapshot.docs.map(async (earningsDoc: any) => {
        const earnings = earningsDoc.data()

        const eventId = earnings.eventId as string
        const eventDoc = await adminDb.collection('events').doc(eventId).get()
        const eventData = eventDoc.exists ? eventDoc.data() : null

        const eventDateRaw = eventData?.start_datetime || eventData?.date_time || eventData?.date || eventData?.created_at
        const eventDate = eventDateRaw?.toDate ? eventDateRaw.toDate() : eventDateRaw ? new Date(eventDateRaw) : new Date()
        const eventDateIso = isNaN(eventDate.getTime()) ? new Date().toISOString() : eventDate.toISOString()

        const grossSales = Number(earnings.grossSales || 0)
        const fees = Number(earnings.platformFee || 0) + Number(earnings.processingFees || 0)
        const netPayout = Number(earnings.netAmount || 0)
        const availableToWithdraw = Number(earnings.availableToWithdraw || 0)
        const withdrawnAmount = Number(earnings.withdrawnAmount || 0)

        const payoutStatus: 'pending' | 'scheduled' | 'paid' | 'on_hold' = (() => {
          if (earnings.settlementStatus === 'ready' && availableToWithdraw > 0) return 'scheduled'
          if (withdrawnAmount > 0 && availableToWithdraw === 0) return 'paid'
          if (earnings.settlementStatus === 'locked' && withdrawnAmount === 0) return 'on_hold'
          return 'pending'
        })()

        return {
          eventId,
          name: eventData?.title || 'Untitled Event',
          date: eventDateIso,
          ticketsSold: Number(earnings.ticketsSold || 0),
          grossSales,
          fees,
          netPayout,
          payoutStatus,
        }
      })
    )

    return summaries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } catch (error) {
    console.error('Error fetching organizer event summaries:', error)
    return []
  }
}

// Calculate upcoming payout
function calculateUpcomingPayout(earnings: any[]) {
  const scheduled = earnings.filter(e => e.payoutStatus === 'scheduled')
  if (scheduled.length === 0) return undefined

  const totalAmount = scheduled.reduce((sum, e) => sum + e.netPayout, 0)
  const nextPayoutDate = new Date()
  nextPayoutDate.setDate(nextPayoutDate.getDate() + 5) // 5 business days from now

  return {
    amount: totalAmount,
    date: nextPayoutDate.toISOString(),
    eventCount: scheduled.length
  }
}

export default async function PayoutsSettingsPage() {
  // Verify authentication
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (!sessionCookie) {
    redirect('/auth/login?redirect=/organizer/settings/payouts')
  }

  let authUser
  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    authUser = decodedClaims
  } catch (error) {
    console.error('Error verifying session:', error)
    redirect('/auth/login?redirect=/organizer/settings/payouts')
  }

  // Ensure this user is an organizer (attendees should go through the upgrade flow)
  try {
    const userDoc = await adminDb.collection('users').doc(authUser.uid).get()
    const role = userDoc.exists ? userDoc.data()?.role : null
    if (role !== 'organizer') {
      redirect('/organizer?redirect=/organizer/settings/payouts')
    }
  } catch (error) {
    console.error('Error checking user role:', error)
    redirect('/organizer?redirect=/organizer/settings/payouts')
  }

  // Fetch payout data
  const [config, eventEarnings] = await Promise.all([
    getPayoutConfig(authUser.uid),
    getOrganizerEventSummaries(authUser.uid)
  ])

  const navbarUser = {
    id: authUser.uid,
    email: authUser.email || '',
    full_name: authUser.name || authUser.email || '',
    role: 'organizer' as const,
  }

  // Serialize data
  const serializedConfig = serializeData(config) || undefined
  const serializedEarnings = serializeData(eventEarnings)
  const upcomingPayout = calculateUpcomingPayout(eventEarnings)

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={navbarUser} />

      <PayoutsPageNew
        config={serializedConfig}
        eventSummaries={serializedEarnings}
        upcomingPayout={upcomingPayout}
        organizerId={authUser.uid}
      />
      
      <MobileNavWrapper user={navbarUser} />
    </div>
  )
}
