/**
 * Event Earnings Management
 * 
 * Handles calculation, tracking, and updating of organizer earnings
 */

import { adminDb } from '@/lib/firebase/admin'
import { calculateFees, calculateSettlementDate, isSettlementReady } from '@/lib/fees'
import type { EventEarnings, SettlementStatus, EarningsSummary } from '@/types/earnings'

type PaymentMethod = 'stripe' | 'stripe_connect' | 'moncash' | 'moncash_button' | 'natcash' | 'sogepay' | 'unknown'

function normalizeCurrency(raw: unknown): 'HTG' | 'USD' {
  const upper = String(raw || '').toUpperCase()
  return upper === 'USD' ? 'USD' : 'HTG'
}

function normalizePaymentMethod(raw: unknown): PaymentMethod {
  const value = String(raw || '').toLowerCase()
  if (value === 'stripe') return 'stripe'
  if (value === 'stripe_connect') return 'stripe_connect'
  if (value === 'moncash_button') return 'moncash_button'
  if (value === 'moncash') return 'moncash'
  if (value === 'natcash') return 'natcash'
  if (value === 'sogepay') return 'sogepay'
  return 'unknown'
}

function calculateEventCurrencyFees(options: {
  grossEventCents: number
  paymentMethod: PaymentMethod
  chargedAmountCents?: number | null
  fxRate?: number | null
}): { grossAmount: number; platformFee: number; processingFee: number; netAmount: number } {
  const grossEventCents = Math.max(0, Math.round(options.grossEventCents || 0))
  if (grossEventCents <= 0) {
    return { grossAmount: 0, platformFee: 0, processingFee: 0, netAmount: 0 }
  }

  // Platform fee is always calculated on organizer-facing gross (event currency).
  const platformSide = calculateFees(grossEventCents)
  const platformFee = platformSide.platformFee

  // Processing fee depends on the payment rail.
  // Stripe fees are in charged/settlement currency, so convert them back to event currency when needed.
  let processingFeeEventCents = 0
  if (options.paymentMethod === 'stripe' || options.paymentMethod === 'stripe_connect') {
    const charged = Math.max(0, Math.round(options.chargedAmountCents ?? grossEventCents))
    const stripeFees = calculateFees(charged)
    const stripeProcessingFeeChargedCents = stripeFees.processingFee
    const fx = typeof options.fxRate === 'number' && Number.isFinite(options.fxRate) && options.fxRate > 0
      ? options.fxRate
      : null

    // fxRate is settlement-per-event (e.g., USD per HTG for Stripe HTG events).
    // Convert charged-currency processing fee back to event currency.
    processingFeeEventCents = fx ? Math.round(stripeProcessingFeeChargedCents / fx) : stripeProcessingFeeChargedCents
  }

  const netAmount = grossEventCents - platformFee - processingFeeEventCents
  return {
    grossAmount: grossEventCents,
    platformFee,
    processingFee: processingFeeEventCents,
    netAmount,
  }
}

async function findEventEarningsDoc(eventId: string) {
  // Current schema: eventId field.
  const byEventId = await adminDb
    .collection('event_earnings')
    .where('eventId', '==', eventId)
    .limit(1)
    .get()
  if (!byEventId.empty) return byEventId.docs[0]

  // Legacy schema: event_id field.
  const byLegacyEventId = await adminDb
    .collection('event_earnings')
    .where('event_id', '==', eventId)
    .limit(1)
    .get()
  if (!byLegacyEventId.empty) return byLegacyEventId.docs[0]

  // Some deployments may have used the eventId as the doc id.
  const byDocId = await adminDb.collection('event_earnings').doc(eventId).get()
  if (byDocId.exists) return byDocId

  return null
}

async function deriveEventEarningsFromTickets(eventId: string): Promise<EventEarnings | null> {
  const eventDoc = await adminDb.collection('events').doc(eventId).get()
  if (!eventDoc.exists) return null

  const event = eventDoc.data() || {}
  const eventDateRaw = event.start_datetime || event.date_time || event.date || event.created_at
  const eventDate = eventDateRaw?.toDate ? eventDateRaw.toDate() : eventDateRaw ? new Date(eventDateRaw) : null
  if (!eventDate || isNaN(eventDate.getTime())) return null

  const ticketsSnapshot = await adminDb.collection('tickets').where('event_id', '==', eventId).get()

  // Organizer-facing earnings should always be presented in the event's currency (listed/original currency).
  const eventCurrency = normalizeCurrency(event.currency || 'HTG')

  // Group by payment_id so fixed processing fee is applied once per purchase.
  const paymentGroups = new Map<
    string,
    {
      grossEventCents: number
      ticketCount: number
      paymentMethod: PaymentMethod
      fxRate: number | null
      chargedAmountCents: number
    }
  >()
  let ticketsSold = 0

  for (const ticketDoc of ticketsSnapshot.docs) {
    const ticket = ticketDoc.data() || {}
    // Accept both legacy "valid" and standard "confirmed" tickets.
    const status = String(ticket.status || '').toLowerCase()
    if (status && status !== 'valid' && status !== 'confirmed') continue

    const pricePaid = Number(ticket.price_paid ?? ticket.pricePaid ?? 0)
    const grossEventCents = Math.round(pricePaid * 100)
    if (!Number.isFinite(grossEventCents) || grossEventCents <= 0) continue

    const paymentMethod = normalizePaymentMethod(ticket.payment_method)
    const fxRate = ticket.exchange_rate_used != null ? Number(ticket.exchange_rate_used) : null

    // If charged amount/currency is explicitly recorded (newer data), use it.
    // Otherwise, infer best-effort based on payment method and exchange rate.
    const chargedAmountMajor = ticket.charged_amount != null ? Number(ticket.charged_amount) : null
    const chargedAmountCents = (() => {
      if (chargedAmountMajor != null && Number.isFinite(chargedAmountMajor) && chargedAmountMajor > 0) {
        return Math.round(chargedAmountMajor * 100)
      }
      if (paymentMethod === 'stripe' && fxRate && Number.isFinite(fxRate) && fxRate > 0) {
        // Stripe HTG events charge in USD: charged = event * fx
        return Math.round((grossEventCents / 100) * fxRate * 100)
      }
      if ((paymentMethod === 'moncash' || paymentMethod === 'moncash_button') && fxRate && Number.isFinite(fxRate) && fxRate > 0) {
        // MonCash USD events charge in HTG: charged = event * fx
        return Math.round((grossEventCents / 100) * fxRate * 100)
      }
      return grossEventCents
    })()

    const paymentId = String(ticket.payment_id ?? ticket.paymentId ?? 'unknown')
    const current =
      paymentGroups.get(paymentId) ||
      ({
        grossEventCents: 0,
        ticketCount: 0,
        paymentMethod,
        fxRate: fxRate && Number.isFinite(fxRate) ? fxRate : null,
        chargedAmountCents: 0,
      } as const)

    // Preserve first non-unknown payment method/fx.
    const methodToUse = current.paymentMethod !== 'unknown' ? current.paymentMethod : paymentMethod
    const fxToUse = current.fxRate ?? (fxRate && Number.isFinite(fxRate) ? fxRate : null)

    paymentGroups.set(paymentId, {
      grossEventCents: current.grossEventCents + grossEventCents,
      ticketCount: current.ticketCount + 1,
      paymentMethod: methodToUse,
      fxRate: fxToUse,
      chargedAmountCents: current.chargedAmountCents + chargedAmountCents,
    })

    ticketsSold += 1
  }

  if (ticketsSold === 0 || paymentGroups.size === 0) return null

  let grossSales = 0
  let platformFee = 0
  let processingFees = 0
  let netAmount = 0

  for (const group of Array.from(paymentGroups.values())) {
    const fees = calculateEventCurrencyFees({
      grossEventCents: group.grossEventCents,
      paymentMethod: group.paymentMethod,
      chargedAmountCents: group.chargedAmountCents,
      fxRate: group.fxRate,
    })
    grossSales += fees.grossAmount
    platformFee += fees.platformFee
    processingFees += fees.processingFee
    netAmount += fees.netAmount
  }

  const settlementReadyDate = calculateSettlementDate(eventDate).toISOString()
  const settlementStatus: SettlementStatus = isSettlementReady(settlementReadyDate) ? 'ready' : 'pending'
  const availableToWithdraw = settlementStatus === 'ready' ? Math.max(0, netAmount) : 0

  const currency = eventCurrency

  const nowIso = new Date().toISOString()
  return {
    id: `derived_${eventId}`,
    eventId,
    organizerId: String(event.organizer_id || event.organizerId || ''),
    grossSales,
    ticketsSold,
    platformFee,
    processingFees,
    netAmount,
    availableToWithdraw,
    withdrawnAmount: 0,
    settlementStatus,
    settlementReadyDate,
    currency,
    lastCalculatedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}

/**
 * Get event earnings record (without creating if missing)
 * 
 * @param eventId - Event ID
 * @returns EventEarnings or null if not found
 */
export async function getEventEarnings(eventId: string): Promise<EventEarnings | null> {
  const doc = await findEventEarningsDoc(eventId)
  if (doc) {
    const stored = { id: doc.id, ...(doc.data() as any) } as EventEarnings

    // If stored currency disagrees with the event currency, prefer a derived view from tickets.
    // This avoids showing Stripe charged currency (USD) for HTG events.
    const eventDoc = await adminDb.collection('events').doc(eventId).get()
    const eventCurrency = eventDoc.exists ? normalizeCurrency((eventDoc.data() as any)?.currency || 'HTG') : null

    if (eventCurrency && normalizeCurrency((stored as any)?.currency || eventCurrency) !== eventCurrency) {
      const derived = await deriveEventEarningsFromTickets(eventId)
      if (derived) {
        const withdrawnAmount = Math.max(0, Number((stored as any).withdrawnAmount || 0) || 0)
        derived.id = stored.id
        derived.withdrawnAmount = withdrawnAmount
        derived.availableToWithdraw =
          derived.settlementStatus === 'ready' ? Math.max(0, Number(derived.netAmount || 0) - withdrawnAmount) : 0
        derived.currency = eventCurrency
        return derived
      }

      // No tickets to derive from; at least align display currency to event currency.
      return { ...stored, currency: eventCurrency } as EventEarnings
    }

    return stored
  }

  // Fallback for legacy data: compute a best-effort view from tickets.
  return deriveEventEarningsFromTickets(eventId)
}

export type EventTierSalesBreakdownRow = {
  tierId: string | null
  tierName: string
  listedUnitPriceCents: number
  listedCurrency: 'HTG' | 'USD'
  ticketsSold: number
  grossSales: number
}

export async function getEventTierSalesBreakdown(eventId: string): Promise<EventTierSalesBreakdownRow[]> {
  const tiers = new Map<string, EventTierSalesBreakdownRow>()

  const eventDoc = await adminDb.collection('events').doc(eventId).get()
  const eventCurrency = eventDoc.exists ? normalizeCurrency((eventDoc.data() as any)?.currency || 'HTG') : 'HTG'

  const normalizeTierName = (value: unknown) => {
    const name = String(value || '').trim()
    return name.length > 0 ? name : 'General Admission'
  }

  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null

  while (true) {
    let queryRef = adminDb
      .collection('tickets')
      .where('event_id', '==', eventId)
      .where('status', '==', 'confirmed')
      .orderBy('purchased_at', 'desc')
      .select(
        'tier_id',
        'tierId',
        'tier_name',
        'tierName',
        'ticket_type',
        'ticketType',
        'price_paid',
        'pricePaid',
        'currency',
        'original_currency',
        'quantity'
      )
      .limit(1000) as FirebaseFirestore.Query

    if (lastDoc) {
      queryRef = (queryRef as any).startAfter(lastDoc)
    }

    const snapshot = await queryRef.get()
    if (snapshot.empty) break

    for (const doc of snapshot.docs) {
      const data: any = doc.data() || {}

      const tierId = (data.tier_id || data.tierId || null) as string | null
      const tierName = normalizeTierName(data.tier_name || data.tierName || data.ticket_type || data.ticketType)

      // Prefer explicit original/listed currency; otherwise fall back to event currency.
      // Do NOT fall back to charged currency, which can be USD for HTG events.
      const listedCurrency = normalizeCurrency(data.original_currency || eventCurrency)

      const quantity = Math.max(1, Number(data.quantity || 1) || 1)
      const pricePaidMajor = Number(data.price_paid ?? data.pricePaid ?? 0) || 0
      const unitPriceCents = Math.max(0, Math.round(pricePaidMajor * 100))
      const grossSales = unitPriceCents * quantity

      const groupKey = `${String(tierId || tierName)}::${unitPriceCents}::${listedCurrency}`

      const existing = tiers.get(groupKey)
      if (existing) {
        existing.ticketsSold += quantity
        existing.grossSales += grossSales
      } else {
        tiers.set(groupKey, {
          tierId,
          tierName,
          listedUnitPriceCents: unitPriceCents,
          listedCurrency,
          ticketsSold: quantity,
          grossSales,
        })
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1]
    if (snapshot.docs.length < 1000) break
  }

  return Array.from(tiers.values()).sort((a, b) => {
    const tierCompare = a.tierName.localeCompare(b.tierName)
    if (tierCompare !== 0) return tierCompare
    if (a.listedCurrency !== b.listedCurrency) return a.listedCurrency.localeCompare(b.listedCurrency)
    return a.listedUnitPriceCents - b.listedUnitPriceCents
  })
}

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
    currency: normalizeCurrency(event.currency || 'HTG'),
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
  quantity: number = 1,
  options?: {
    currency?: string
    paymentMethod?: PaymentMethod | string
    chargedAmountCents?: number
    chargedCurrency?: string
    fxRate?: number | null
  }
): Promise<void> {
  const { ref, data } = await getOrCreateEventEarnings(eventId)

  const paymentMethod = normalizePaymentMethod(options?.paymentMethod)
  const fxRate = options?.fxRate != null ? Number(options.fxRate) : null
  const chargedAmountCents = options?.chargedAmountCents

  const fees = calculateEventCurrencyFees({
    grossEventCents: ticketAmount,
    paymentMethod,
    chargedAmountCents,
    fxRate,
  })

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
