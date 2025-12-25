/**
 * Admin Event Disbursement Tracking
 * Shows events that have ended and are ready for payout processing
 */

import { adminDb } from '@/lib/firebase/admin'
import { getPayoutProfile } from '@/lib/firestore/payout-profiles'

export interface EventDisbursementInfo {
  eventId: string
  eventTitle: string
  organizerId: string
  organizerName: string
  organizerEmail: string
  
  // Event dates
  startDate: Date
  endDate: Date
  daysEnded: number
  
  // Financial info
  totalTicketsSold: number
  grossRevenue: number
  platformFee: number
  netRevenue: number
  currency: string
  
  // Payout status
  hasPendingPayout: boolean
  hasCompletedPayout: boolean
  payoutEligible: boolean
  
  // Bank info
  payoutMethod?: string
  bankInfo?: {
    accountName?: string
    accountNumber?: string
    bankName?: string
    routingNumber?: string
    mobileNumber?: string
    provider?: string
  }
}

/**
 * Get events that have ended and need payout processing
 */
export async function getEndedEventsForDisbursement(
  daysAgo: number = 30
): Promise<EventDisbursementInfo[]> {
  try {
    const now = new Date()
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    // Get events that have ended
    const eventsSnapshot = await adminDb
      .collection('events')
      .where('end_datetime', '<=', now)
      .where('end_datetime', '>=', cutoffDate)
      .orderBy('end_datetime', 'desc')
      .limit(100)
      .get()

    const disbursementInfo: EventDisbursementInfo[] = []

    for (const eventDoc of eventsSnapshot.docs) {
      const event = eventDoc.data()
      const eventId = eventDoc.id
      const organizerId = event.organizer_id

      if (!organizerId) continue

      // Get organizer details
      const organizerDoc = await adminDb.collection('users').doc(organizerId).get()
      const organizer = organizerDoc.data()

      // Get payout config
      const haitiProfile = await getPayoutProfile(organizerId, 'haiti')

      // Get tickets for this event
      const ticketsSnapshot = await adminDb
        .collection('tickets')
        .where('eventId', '==', eventId)
        .where('status', '==', 'confirmed')
        .get()

      const tickets = ticketsSnapshot.docs.map((doc: any) => doc.data())
      const totalTicketsSold = tickets.length

      // Calculate revenue
      let grossRevenue = 0
      const currency = event.currency || 'HTG'
      
      for (const ticket of tickets) {
        grossRevenue += ticket.price_paid || 0
      }

      // Platform fee (5% default)
      const platformFeeRate = 0.05
      const platformFee = grossRevenue * platformFeeRate
      const netRevenue = grossRevenue - platformFee

      // Check if payout already exists
      const payoutsSnapshot = await adminDb
        .collection('organizers')
        .doc(organizerId)
        .collection('payouts')
        .where('eventId', '==', eventId)
        .get()

      const hasPendingPayout = payoutsSnapshot.docs.some(
        (doc: any) => doc.data().status === 'pending'
      )
      const hasCompletedPayout = payoutsSnapshot.docs.some(
        (doc: any) => ['paid', 'completed'].includes(doc.data().status)
      )

      // Event is eligible for payout if:
      // 1. Has ended
      // 2. Has sold tickets
      // 3. Doesn't have a completed payout
      // 4. Organizer has payout config set up
      const endDate = event.end_datetime?.toDate?.() || new Date(event.end_datetime)
      const daysEnded = Math.floor((now.getTime() - endDate.getTime()) / (24 * 60 * 60 * 1000))
      const payoutEligible = 
        daysEnded >= 0 && 
        totalTicketsSold > 0 && 
        !hasCompletedPayout &&
        !!haitiProfile?.method

      // Extract bank info based on payment method
      let bankInfo: any = {}
      if (haitiProfile) {
        if (haitiProfile.method === 'bank_transfer') {
          bankInfo = {
            accountName: haitiProfile.bankDetails?.accountName,
            accountNumber: haitiProfile.bankDetails?.accountNumber,
            bankName: haitiProfile.bankDetails?.bankName,
            routingNumber: haitiProfile.bankDetails?.routingNumber,
          }
        } else if (haitiProfile.method === 'mobile_money') {
          bankInfo = {
            mobileNumber: haitiProfile.mobileMoneyDetails?.phoneNumber,
            provider: haitiProfile.mobileMoneyDetails?.provider,
          }
        }
      }

      disbursementInfo.push({
        eventId,
        eventTitle: event.title || 'Untitled Event',
        organizerId,
        organizerName: organizer?.full_name || 'Unknown',
        organizerEmail: organizer?.email || '',
        startDate: event.start_datetime?.toDate?.() || new Date(event.start_datetime),
        endDate,
        daysEnded,
        totalTicketsSold,
        grossRevenue,
        platformFee,
        netRevenue,
        currency,
        hasPendingPayout,
        hasCompletedPayout,
        payoutEligible,
        payoutMethod: haitiProfile?.method,
        bankInfo
      })
    }

    return disbursementInfo.sort((a, b) => b.daysEnded - a.daysEnded)
  } catch (error) {
    console.error('Error fetching ended events:', error)
    return []
  }
}

/**
 * Get summary statistics for disbursements
 */
export async function getDisbursementStats() {
  try {
    const now = new Date()
    
    // Events ended in last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const recentEndedSnapshot = await adminDb
      .collection('events')
      .where('end_datetime', '<=', now)
      .where('end_datetime', '>=', sevenDaysAgo)
      .get()

    // Pending payouts
    const pendingPayoutsSnapshot = await adminDb
      .collectionGroup('payouts')
      .where('status', '==', 'pending')
      .get()

    // Approved payouts
    const approvedPayoutsSnapshot = await adminDb
      .collectionGroup('payouts')
      .where('status', '==', 'approved')
      .get()

    // Calculate total pending amount
    let totalPendingAmount = 0
    pendingPayoutsSnapshot.docs.forEach((doc: any) => {
      totalPendingAmount += doc.data().amount || 0
    })

    return {
      eventsEndedLast7Days: recentEndedSnapshot.size,
      pendingPayouts: pendingPayoutsSnapshot.size,
      approvedPayouts: approvedPayoutsSnapshot.size,
      totalPendingAmount
    }
  } catch (error) {
    console.error('Error fetching disbursement stats:', error)
    return {
      eventsEndedLast7Days: 0,
      pendingPayouts: 0,
      approvedPayouts: 0,
      totalPendingAmount: 0
    }
  }
}
