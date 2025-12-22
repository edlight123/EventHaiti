import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getPayoutConfig } from '@/lib/firestore/payout'
import { serializeData } from '@/lib/utils/serialize'
import { calculateFees, calculateSettlementDate } from '@/lib/fees'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PayoutsPageNew from './PayoutsPageNew'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getOrganizerEventSummaries(organizerId: string) {
  try {
    // Primary source: precomputed earnings docs.
    // Note: older schemas may have organizer_id instead of organizerId.
    const [earningsSnapshot, legacyEarningsSnapshot] = await Promise.all([
      adminDb.collection('event_earnings').where('organizerId', '==', organizerId).get(),
      adminDb.collection('event_earnings').where('organizer_id', '==', organizerId).get(),
    ])

    const earningsDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>()
    for (const docSnap of earningsSnapshot.docs) earningsDocs.set(docSnap.id, docSnap)
    for (const docSnap of legacyEarningsSnapshot.docs) earningsDocs.set(docSnap.id, docSnap)

    if (earningsDocs.size > 0) {
      const summaries = await Promise.all(
        Array.from(earningsDocs.values()).map(async (earningsDoc: any) => {
          const earnings = earningsDoc.data() || {}

          const eventId = (earnings.eventId || earnings.event_id || earningsDoc.id) as string
          const eventDoc = await adminDb.collection('events').doc(eventId).get()
          const eventData = eventDoc.exists ? eventDoc.data() : null

          const eventDateRaw =
            eventData?.start_datetime ||
            eventData?.date_time ||
            eventData?.date ||
            eventData?.created_at
          const eventDate = eventDateRaw?.toDate ? eventDateRaw.toDate() : eventDateRaw ? new Date(eventDateRaw) : new Date()
          const eventDateIso = isNaN(eventDate.getTime()) ? new Date().toISOString() : eventDate.toISOString()

          const grossSales = Number(earnings.grossSales || earnings.gross_sales || 0)
          const fees = Number(earnings.platformFee || earnings.platform_fee || 0) + Number(earnings.processingFees || earnings.processing_fees || 0)
          const netPayout = Number(earnings.netAmount || earnings.net_amount || 0)
          const availableToWithdraw = Number(earnings.availableToWithdraw || earnings.available_to_withdraw || 0)
          const withdrawnAmount = Number(earnings.withdrawnAmount || earnings.withdrawn_amount || 0)

          const payoutStatus: 'pending' | 'scheduled' | 'paid' | 'on_hold' = (() => {
            const settlementStatus = String(earnings.settlementStatus || earnings.settlement_status || '')
            if (settlementStatus === 'ready' && availableToWithdraw > 0) return 'scheduled'
            if (withdrawnAmount > 0 && availableToWithdraw === 0) return 'paid'
            if (settlementStatus === 'locked' && withdrawnAmount === 0) return 'on_hold'
            return 'pending'
          })()

          return {
            eventId,
            name: eventData?.title || 'Untitled Event',
            date: eventDateIso,
            ticketsSold: Number(earnings.ticketsSold || earnings.tickets_sold || 0),
            grossSales,
            fees,
            netPayout,
            payoutStatus,
          }
        })
      )

      return summaries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }

    // Fallback: derive earnings from tickets + events.
    // This keeps the payouts settings page useful even if event_earnings hasn't been backfilled yet.
    const eventsSnapshot = await adminDb.collection('events').where('organizer_id', '==', organizerId).get()
    if (eventsSnapshot.empty) return []

    const now = new Date()
    const summaries = await Promise.all(
      eventsSnapshot.docs.map(async (eventDoc: FirebaseFirestore.QueryDocumentSnapshot) => {
        const eventData = eventDoc.data() || {}
        const eventId = eventDoc.id

        const eventDateRaw = eventData?.start_datetime || eventData?.date_time || eventData?.date || eventData?.created_at
        const eventDate = eventDateRaw?.toDate ? eventDateRaw.toDate() : eventDateRaw ? new Date(eventDateRaw) : new Date()
        const eventDateIso = isNaN(eventDate.getTime()) ? new Date().toISOString() : eventDate.toISOString()

        // Avoid composite index requirements by only filtering by event_id at query time.
        const ticketsSnapshot = await adminDb.collection('tickets').where('event_id', '==', eventId).get()

        // Group by payment_id so we can apply fixed processing fees per purchase.
        const paymentGroups = new Map<string, { grossCents: number; ticketCount: number }>()
        let ticketsSold = 0

        for (const ticketDoc of ticketsSnapshot.docs) {
          const ticket = ticketDoc.data() || {}
          if (ticket.status && String(ticket.status).toLowerCase() !== 'valid') continue

          const pricePaid = Number(ticket.price_paid ?? ticket.pricePaid ?? 0)
          const grossCents = Math.round(pricePaid * 100)

          const paymentId = String(ticket.payment_id ?? ticket.paymentId ?? 'unknown')
          const current = paymentGroups.get(paymentId) || { grossCents: 0, ticketCount: 0 }
          current.grossCents += grossCents
          current.ticketCount += 1
          paymentGroups.set(paymentId, current)

          ticketsSold += 1
        }

        let grossSales = 0
        let platformFee = 0
        let processingFees = 0
        let netAmount = 0

        for (const group of Array.from(paymentGroups.values())) {
          const fees = calculateFees(group.grossCents)
          grossSales += fees.grossAmount
          platformFee += fees.platformFee
          processingFees += fees.processingFee
          netAmount += fees.netAmount
        }

        const settlementReadyDate = calculateSettlementDate(eventDate)
        const payoutStatus: 'pending' | 'scheduled' | 'paid' | 'on_hold' =
          netAmount > 0 && settlementReadyDate <= now ? 'scheduled' : 'pending'

        return {
          eventId,
          name: eventData?.title || 'Untitled Event',
          date: eventDateIso,
          ticketsSold,
          grossSales,
          fees: platformFee + processingFees,
          netPayout: netAmount,
          payoutStatus,
        }
      })
    )

    // Hide events with no sales to avoid a noisy table.
    return summaries
      .filter((s) => (s.ticketsSold || 0) > 0 || (s.grossSales || 0) > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
