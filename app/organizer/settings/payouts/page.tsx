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

// Helper to get event earnings summaries
async function getEventEarnings(organizerId: string) {
  try {
    // Fetch all events for this organizer
    const eventsSnapshot = await adminDb
      .collection('events')
      .where('organizer_id', '==', organizerId)
      .get()

    console.log(`[Payouts] Found ${eventsSnapshot.size} events for organizer ${organizerId}`)

    const earnings = await Promise.all(
      eventsSnapshot.docs.map(async (eventDoc: any) => {
        const eventData = eventDoc.data()
        
        // Fetch tickets for this event
        const ticketsSnapshot = await adminDb
          .collection('tickets')
          .where('event_id', '==', eventDoc.id)
          .where('status', '==', 'active')
          .get()

        console.log(`[Payouts] Event ${eventData.title}: ${ticketsSnapshot.size} tickets`)

        // Calculate earnings
        let grossSales = 0
        ticketsSnapshot.docs.forEach((ticketDoc: any) => {
          const ticketData = ticketDoc.data()
          grossSales += ticketData.price || 0
        })

        // Calculate fees (2.5% platform + 2.9% + HTG 15 processing)
        const platformFee = grossSales * 0.025
        const processingFee = grossSales * 0.029 + (ticketsSnapshot.size * 15)
        const totalFees = platformFee + processingFee
        const netPayout = grossSales - totalFees

        // Determine payout status
        const eventDate = eventData.date?.toDate ? eventData.date.toDate() : new Date(eventData.date)
        const now = new Date()
        const daysSinceEvent = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24))
        
        let payoutStatus: 'pending' | 'scheduled' | 'paid' | 'on_hold' = 'pending'
        if (daysSinceEvent >= 7) {
          payoutStatus = 'scheduled'
        }
        if (daysSinceEvent >= 12) {
          payoutStatus = 'paid'
        }

        return {
          eventId: eventDoc.id,
          name: eventData.title || 'Untitled Event',
          date: eventDate.toISOString(),
          ticketsSold: ticketsSnapshot.size,
          grossSales,
          fees: totalFees,
          netPayout,
          payoutStatus
        }
      })
    )

    const filteredEarnings = earnings.filter(e => e.ticketsSold > 0)
    console.log(`[Payouts] Total events: ${earnings.length}, with sales: ${filteredEarnings.length}`)
    
    // For now, return all events to help with debugging
    return earnings.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  } catch (error) {
    console.error('Error fetching event earnings:', error)
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
  const [config, eventEarnings] = await Promise.all([
    getPayoutConfig(authUser.uid),
    getEventEarnings(authUser.uid)
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
