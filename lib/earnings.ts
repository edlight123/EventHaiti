/**
 * Event Earnings Management
 * 
 * Handles calculation, tracking, and updating of organizer earnings
 */

import { adminDb } from '@/lib/firebase/admin'
import { calculateFees, calculateSettlementDate, isSettlementReady } from '@/lib/fees'
import type { EventEarnings, SettlementStatus, EarningsSummary } from '@/types/earnings'

/**
 * Get or create event earnings record
 * 
 * @param eventId - Event ID
 * @returns EventEarnings document reference
 */
export async function getOrCreateEventEarnings(eventId: string): Promise<{
  ref: FirebaseFirestore.DocumentReference
  data: EventEarnings | null
}> {
  // Try to find existing earnings
  const earningsSnapshot = await adminDb
    .collection('event_earnings')
    .where('eventId', '==', eventId)
    .limit(1)
    .get()

  if (!earningsSnapshot.empty) {
    const doc = earningsSnapshot.docs[0]
    return {
      ref: doc.ref,
      data: { id: doc.id, ...doc.data() } as EventEarnings,
    }
  }

  // Create new earnings record
  const eventDoc = await adminDb.collection('events').doc(eventId).get()
  if (!eventDoc.exists) {
    throw new Error(`Event ${eventId} not found`)
  }

  const event = eventDoc.data()!
  const settlementDate = calculateSettlementDate(new Date(event.start_datetime))

  const newEarningsRef = adminDb.collection('event_earnings').doc()
  const newEarnings: Omit<EventEarnings, 'id'> = {
    eventId,
    organizerId: event.organizer_id,
    grossSales: 0,
    ticketsSold: 0,
    platformFee: 0,
    processingFees: 0,
    netAmount: 0,
    availableToWithdraw: 0,
    withdrawnAmount: 0,
    settlementStatus: 'pending',
    settlementReadyDate: settlementDate.toISOString(),
    currency: event.currency || 'HTG',
    lastCalculatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await newEarningsRef.set(newEarnings)

  return {
    ref: newEarningsRef,
    data: { id: newEarningsRef.id, ...newEarnings },
  }
}

/**
 * Update earnings when a ticket is purchased
 * Called from Stripe webhook after successful payment
 * 
 * @param eventId - Event ID
 * @param ticketAmount - Amount paid for ticket(s) in cents
 * @param quantity - Number of tickets purchased
 */
export async function addTicketToEarnings(
  eventId: string,
  ticketAmount: number,
  quantity: number = 1
): Promise<void> {
  const { ref, data } = await getOrCreateEventEarnings(eventId)

  // Calculate fees for this transaction
  const fees = calculateFees(ticketAmount)

  // Update earnings
  const updates: Partial<EventEarnings> = {
    grossSales: (data?.grossSales || 0) + fees.grossAmount,
    ticketsSold: (data?.ticketsSold || 0) + quantity,
    platformFee: (data?.platformFee || 0) + fees.platformFee,
    processingFees: (data?.processingFees || 0) + fees.processingFee,
    netAmount: (data?.netAmount || 0) + fees.netAmount,
    availableToWithdraw: (data?.availableToWithdraw || 0) + fees.netAmount,
    lastCalculatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await ref.update(updates)

  console.log(`✅ Updated earnings for event ${eventId}:`, {
    ticketAmount: fees.grossAmount,
    netAdded: fees.netAmount,
    newTotal: updates.grossSales,
  })
}

/**
 * Process withdrawal from event earnings
 * Decreases availableToWithdraw and increases withdrawnAmount
 * 
 * @param eventId - Event ID
 * @param amount - Amount to withdraw in cents
 * @param payoutId - Payout request ID for tracking
 * @returns Success status
 */
export async function withdrawFromEarnings(
  eventId: string,
  amount: number,
  payoutId: string
): Promise<{ success: boolean; error?: string }> {
  const { ref, data } = await getOrCreateEventEarnings(eventId)

  if (!data) {
    return { success: false, error: 'Earnings not found' }
  }

  // Validate withdrawal
  if (data.availableToWithdraw < amount) {
    return {
      success: false,
      error: `Insufficient funds. Available: ${data.availableToWithdraw}, Requested: ${amount}`,
    }
  }

  if (data.settlementStatus !== 'ready') {
    return {
      success: false,
      error: `Funds not yet available. Settlement status: ${data.settlementStatus}`,
    }
  }

  // Process withdrawal
  await ref.update({
    availableToWithdraw: data.availableToWithdraw - amount,
    withdrawnAmount: data.withdrawnAmount + amount,
    settlementStatus: data.availableToWithdraw - amount === 0 ? 'locked' : 'ready',
    updatedAt: new Date().toISOString(),
  })

  console.log(`✅ Withdrew ${amount} from event ${eventId} for payout ${payoutId}`)

  return { success: true }
}

/**
 * Refund a ticket and update earnings
 * 
 * @param eventId - Event ID
 * @param ticketAmount - Amount to refund in cents
 * @param quantity - Number of tickets refunded
 */
export async function refundTicketFromEarnings(
  eventId: string,
  ticketAmount: number,
  quantity: number = 1
): Promise<void> {
  const { ref, data } = await getOrCreateEventEarnings(eventId)

  if (!data) {
    throw new Error('Earnings not found')
  }

  // Calculate fees that were charged
  const fees = calculateFees(ticketAmount)

  // Reverse the earnings
  const updates: Partial<EventEarnings> = {
    grossSales: Math.max(0, data.grossSales - fees.grossAmount),
    ticketsSold: Math.max(0, data.ticketsSold - quantity),
    platformFee: Math.max(0, data.platformFee - fees.platformFee),
    processingFees: Math.max(0, data.processingFees - fees.processingFee),
    netAmount: Math.max(0, data.netAmount - fees.netAmount),
    availableToWithdraw: Math.max(0, data.availableToWithdraw - fees.netAmount),
    lastCalculatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await ref.update(updates)

  console.log(`✅ Refunded ${ticketAmount} from event ${eventId}`)
}

/**
 * Update settlement status for an event
 * Called by cron job or manually
 * 
 * @param eventId - Event ID
 */
export async function updateSettlementStatus(eventId: string): Promise<SettlementStatus> {
  const { ref, data } = await getOrCreateEventEarnings(eventId)

  if (!data) {
    throw new Error('Earnings not found')
  }

  let newStatus: SettlementStatus = data.settlementStatus

  // Check if settlement date has passed
  if (
    data.settlementStatus === 'pending' &&
    data.settlementReadyDate &&
    isSettlementReady(data.settlementReadyDate)
  ) {
    newStatus = 'ready'
    await ref.update({
      settlementStatus: newStatus,
      updatedAt: new Date().toISOString(),
    })
    console.log(`✅ Event ${eventId} settlement status changed to 'ready'`)
  }

  return newStatus
}

/**
 * Get earnings summary for an organizer
 * 
 * @param organizerId - Organizer user ID
 * @returns Summary of all earnings
 */
export async function getOrganizerEarningsSummary(
  organizerId: string
): Promise<EarningsSummary> {
  const earningsSnapshot = await adminDb
    .collection('event_earnings')
    .where('organizerId', '==', organizerId)
    .get()

  let totalGrossSales = 0
  let totalNetAmount = 0
  let totalAvailableToWithdraw = 0
  let totalWithdrawn = 0
  let totalPlatformFees = 0
  let totalProcessingFees = 0
  let currency = 'HTG'

  const events: EarningsSummary['events'] = []

  for (const doc of earningsSnapshot.docs) {
    const data = doc.data() as EventEarnings

    totalGrossSales += data.grossSales
    totalNetAmount += data.netAmount
    totalAvailableToWithdraw += data.availableToWithdraw
    totalWithdrawn += data.withdrawnAmount
    totalPlatformFees += data.platformFee
    totalProcessingFees += data.processingFees
    currency = data.currency

    // Get event details
    const eventDoc = await adminDb.collection('events').doc(data.eventId).get()
    const event = eventDoc.data()

    events.push({
      eventId: data.eventId,
      eventTitle: event?.title || 'Unknown Event',
      eventDate: event?.start_datetime || '',
      grossSales: data.grossSales,
      netAmount: data.netAmount,
      availableToWithdraw: data.availableToWithdraw,
      settlementStatus: data.settlementStatus,
    })
  }

  return {
    totalGrossSales,
    totalNetAmount,
    totalAvailableToWithdraw,
    totalWithdrawn,
    totalPlatformFees,
    totalProcessingFees,
    currency,
    events: events.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()),
  }
}

/**
 * Get available events for withdrawal
 * Returns events with settlement status 'ready' and available balance > 0
 * 
 * @param organizerId - Organizer user ID
 * @returns List of events with withdrawable funds
 */
export async function getWithdrawableEvents(organizerId: string): Promise<EventEarnings[]> {
  const earningsSnapshot = await adminDb
    .collection('event_earnings')
    .where('organizerId', '==', organizerId)
    .where('settlementStatus', '==', 'ready')
    .get()

  const withdrawable: EventEarnings[] = []

  for (const doc of earningsSnapshot.docs) {
    const data = { id: doc.id, ...doc.data() } as EventEarnings

    if (data.availableToWithdraw > 0) {
      withdrawable.push(data)
    }
  }

  return withdrawable
}

/**
 * Calculate total available balance across all events
 * 
 * @param organizerId - Organizer user ID
 * @returns Total available to withdraw in cents
 */
export async function getTotalAvailableBalance(organizerId: string): Promise<{
  available: number
  pending: number
  currency: string
}> {
  const earningsSnapshot = await adminDb
    .collection('event_earnings')
    .where('organizerId', '==', organizerId)
    .get()

  let available = 0
  let pending = 0
  let currency = 'HTG'

  for (const doc of earningsSnapshot.docs) {
    const data = doc.data() as EventEarnings
    currency = data.currency

    if (data.settlementStatus === 'ready') {
      available += data.availableToWithdraw
    } else if (data.settlementStatus === 'pending') {
      pending += data.availableToWithdraw
    }
  }

  return { available, pending, currency }
}
