import { adminDb } from '@/lib/firebase/admin'

export type PayoutStatus = 'not_setup' | 'pending_verification' | 'active' | 'on_hold'
export type PayoutMethod = 'bank_transfer' | 'mobile_money'

export interface PayoutConfig {
  status: PayoutStatus
  method?: PayoutMethod
  bankDetails?: {
    accountName: string
    accountNumber: string // masked after save
    bankName: string
    routingNumber?: string
  }
  mobileMoneyDetails?: {
    provider: string // 'moncash' | 'natcash' | etc
    phoneNumber: string // masked after save
    accountName: string
  }
  verificationStatus?: {
    identity: 'pending' | 'verified' | 'failed'
    bank: 'pending' | 'verified' | 'failed'
    phone: 'pending' | 'verified' | 'failed'
  }
  createdAt: string
  updatedAt: string
}

export interface Payout {
  id: string
  organizerId: string
  amount: number // in cents
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  method: PayoutMethod
  failureReason?: string
  scheduledDate: string
  processedDate?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  
  // NEW: Idempotency & admin workflow fields
  requestedBy: string           // organizerId (for audit)
  approvedBy?: string           // admin userId
  approvedAt?: string
  declinedBy?: string           // admin userId  
  declinedAt?: string
  declineReason?: string
  
  // NEW: Ticket tracking (prevent double-counting)
  ticketIds: string[]           // List of ticket IDs included in this payout
  periodStart: string           // Earliest ticket purchased_at
  periodEnd: string             // Latest ticket purchased_at
  
  // NEW: Manual payment tracking
  paymentReferenceId?: string   // Admin enters after bank/MonCash transfer
  paymentMethod?: 'moncash' | 'natcash' | 'bank_transfer'  // Actual method used
  paymentNotes?: string         // Admin notes
}

const hasBankMethod = (config?: PayoutConfig | null) =>
  Boolean(config && config.method === 'bank_transfer' && config.bankDetails)

const hasMobileMoneyMethod = (config?: PayoutConfig | null) =>
  Boolean(config && config.method === 'mobile_money' && config.mobileMoneyDetails)

export const hasPayoutMethod = (config?: PayoutConfig | null): boolean =>
  hasBankMethod(config) || hasMobileMoneyMethod(config)

const identityVerified = (config?: PayoutConfig | null) =>
  config?.verificationStatus?.identity === 'verified'

const bankVerified = (config?: PayoutConfig | null) =>
  config?.method !== 'bank_transfer' || config?.verificationStatus?.bank === 'verified'

const phoneVerified = (config?: PayoutConfig | null) =>
  config?.method !== 'mobile_money' || config?.verificationStatus?.phone === 'verified'

export function determinePayoutStatus(config: PayoutConfig | null): PayoutStatus {
  if (!config || !hasPayoutMethod(config)) {
    return 'not_setup'
  }

  if (config.status === 'on_hold') {
    return 'on_hold'
  }

  if (identityVerified(config) && bankVerified(config) && phoneVerified(config)) {
    return 'active'
  }

  return 'pending_verification'
}

export async function recomputePayoutStatus(
  organizerId: string
): Promise<PayoutStatus | null> {
  try {
    const configRef = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payoutConfig')
      .doc('main')

    const configSnapshot = await configRef.get()

    if (!configSnapshot.exists) {
      return null
    }

    const current = configSnapshot.data() as PayoutConfig
    const nextStatus = determinePayoutStatus(current)

    if (current.status !== nextStatus) {
      await configRef.set(
        {
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
    }

    return nextStatus
  } catch (error) {
    console.error('Error recomputing payout status:', error)
    return null
  }
}

/**
 * Get payout configuration for an organizer
 */
export async function getPayoutConfig(organizerId: string): Promise<PayoutConfig | null> {
  try {
    const configDoc = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payoutConfig')
      .doc('main')
      .get()

    if (!configDoc.exists) {
      return null
    }

    const data = configDoc.data()!
    
    // Helper function to convert timestamps
    const convertTimestamp = (value: any, fallback: string = new Date().toISOString()): string => {
      if (!value) return fallback
      if (value.toDate && typeof value.toDate === 'function') {
        return value.toDate().toISOString()
      }
      if (typeof value === 'string') return value
      if (value instanceof Date) return value.toISOString()
      try {
        return new Date(value).toISOString()
      } catch {
        return fallback
      }
    }

    // Check if user has already completed organizer verification (from /organizer/verify)
    // Check verification_requests collection for existing verification
    const organizerVerificationDoc = await adminDb
      .collection('verification_requests')
      .doc(organizerId)
      .get()
    
    let hasOrganizerVerification = false
    
    if (organizerVerificationDoc.exists) {
      const verificationData = organizerVerificationDoc.data()
      
      // Check multiple verification indicators:
      // 1. Status field (new format): approved, in_review, or pending
      const hasApprovedStatus = verificationData?.status === 'approved' || 
                                verificationData?.status === 'in_review' ||
                                verificationData?.status === 'pending'
      
      // 2. Government ID uploaded (new format with nested steps)
      const hasGovernmentIdFiles = verificationData?.files?.governmentId?.front ||
                                    verificationData?.files?.governmentId?.back
      
      // 3. Government ID step marked complete
      const hasCompleteStep = verificationData?.steps?.governmentId?.status === 'complete'
      
      // 4. Old schema format - direct URL fields
      const hasOldFormatUrls = verificationData?.id_front_url || verificationData?.id_back_url
      
      // User is verified if ANY of these conditions are true
      hasOrganizerVerification = hasApprovedStatus || hasGovernmentIdFiles || hasCompleteStep || hasOldFormatUrls
    }
    
    // Also check the users collection verification_status field
    if (!hasOrganizerVerification) {
      const userDoc = await adminDb.collection('users').doc(organizerId).get()
      const userVerificationStatus = userDoc.data()?.verification_status
      hasOrganizerVerification = userVerificationStatus === 'approved'
    }

    // Get payout-specific verification documents
    const verificationDocs = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('verificationDocuments')
      .get()

    const verificationStatus: PayoutConfig['verificationStatus'] = {
      // If they've completed organizer verification, mark identity as verified
      identity: hasOrganizerVerification ? 'verified' : 'pending',
      bank: 'pending',
      phone: 'pending',
    }

    verificationDocs.docs.forEach((doc: any) => {
      const docData = doc.data()
      const type = doc.id as 'identity' | 'bank' | 'phone'
      if (type in verificationStatus) {
        // Only override identity verification if not already verified from organizer verification
        if (type === 'identity' && hasOrganizerVerification) {
          // Keep it as 'verified' from organizer verification
          return
        }
        verificationStatus[type] = docData.status || 'pending'
      }
    })

    // Merge with data from config, prioritizing computed verification status (especially for identity)
    const finalVerificationStatus = {
      // For identity: prioritize organizer verification check, then payout-specific verification, then config data
      identity: verificationStatus.identity,
      // For bank/phone: use verification docs first, then config data
      bank: verificationStatus.bank !== 'pending' ? verificationStatus.bank : (data.verificationStatus?.bank || 'pending'),
      phone: verificationStatus.phone !== 'pending' ? verificationStatus.phone : (data.verificationStatus?.phone || 'pending'),
    }

    const baseConfig: PayoutConfig = {
      status: data.status || 'not_setup',
      method: data.method,
      bankDetails: data.bankDetails,
      mobileMoneyDetails: data.mobileMoneyDetails,
      verificationStatus: finalVerificationStatus,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt)
    }

    return {
      ...baseConfig,
      status: determinePayoutStatus(baseConfig)
    }
  } catch (error) {
    console.error('Error fetching payout config:', error)
    return null
  }
}

/**
 * Update payout configuration
 */
export async function updatePayoutConfig(
  organizerId: string,
  updates: Partial<PayoutConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    const configRef = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payoutConfig')
      .doc('main')

    const now = new Date().toISOString()
    
    // Mask sensitive data before saving
    const updateData: any = {
      ...updates,
      updatedAt: now
    }

    // If bank details are being updated, mask the account number
    if (updates.bankDetails?.accountNumber) {
      const accountNumber = updates.bankDetails.accountNumber
      updateData.bankDetails = {
        ...updates.bankDetails,
        accountNumber: maskAccountNumber(accountNumber),
        accountNumberLast4: accountNumber.slice(-4)
      }
    }

    // If mobile money details are being updated, mask the phone number
    if (updates.mobileMoneyDetails?.phoneNumber) {
      const phoneNumber = updates.mobileMoneyDetails.phoneNumber
      updateData.mobileMoneyDetails = {
        ...updates.mobileMoneyDetails,
        phoneNumber: maskPhoneNumber(phoneNumber),
        phoneNumberLast4: phoneNumber.slice(-4)
      }
    }

    const configDoc = await configRef.get()
    if (!configDoc.exists) {
      updateData.createdAt = now
    }

    await configRef.set(updateData, { merge: true })

    await recomputePayoutStatus(organizerId)

    return { success: true }
  } catch (error: any) {
    console.error('Error updating payout config:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get payout history for an organizer
 */
export async function getPayoutHistory(organizerId: string, limit: number = 10): Promise<Payout[]> {
  try {
    const payoutsSnapshot = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payouts')
      .get()

    const payouts = payoutsSnapshot.docs.map((doc: any) => {
      const data = doc.data()
      
      const convertTimestamp = (value: any, fallback: string = new Date().toISOString()): string => {
        if (!value) return fallback
        if (value.toDate && typeof value.toDate === 'function') {
          return value.toDate().toISOString()
        }
        if (typeof value === 'string') return value
        if (value instanceof Date) return value.toISOString()
        try {
          return new Date(value).toISOString()
        } catch {
          return fallback
        }
      }

      return {
        id: doc.id,
        organizerId: data.organizerId,
        amount: data.amount || 0,
        status: data.status || 'pending',
        method: data.method,
        failureReason: data.failureReason,
        scheduledDate: convertTimestamp(data.scheduledDate),
        processedDate: data.processedDate ? convertTimestamp(data.processedDate) : undefined,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      }
    })

    // Sort by created date descending and limit
    payouts.sort((a: Payout, b: Payout) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return payouts.slice(0, limit)
  } catch (error) {
    console.error('Error fetching payout history:', error)
    return []
  }
}

/**
 * Calculate organizer balance from ticket sales
 * 
 * IDEMPOTENCY GUARANTEE: Tickets already included in completed/processing payouts
 * are excluded from available balance to prevent double-counting.
 */
export async function getOrganizerBalance(organizerId: string): Promise<{
  available: number       // Ready to withdraw (cents)
  pending: number        // Locked until event ends (cents)
  nextPayoutDate: string | null
  totalEarnings: number  // All-time earnings (cents)
  currency: string       // HTG, USD, etc.
}> {
  try {
    // Step 1: Get all organizer's events
    const eventsSnapshot = await adminDb
      .collection('events')
      .where('organizer_id', '==', organizerId)
      .get()

    if (eventsSnapshot.empty) {
      return { 
        available: 0, 
        pending: 0, 
        nextPayoutDate: null, 
        totalEarnings: 0,
        currency: 'HTG' 
      }
    }

    const events = eventsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }))
    
    const eventIds = events.map((e: any) => e.id)
    const primaryCurrency = events[0]?.currency || 'HTG'

    // Step 2: Get all completed/processing payouts to find already-paid ticket IDs
    const payoutsSnapshot = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payouts')
      .where('status', 'in', ['completed', 'processing'])
      .get()

    const paidTicketIds = new Set<string>()
    payoutsSnapshot.docs.forEach((doc: any) => {
      const ticketIds = doc.data().ticketIds || []
      ticketIds.forEach((id: string) => paidTicketIds.add(id))
    })

    // Step 3: Query tickets in batches (Firestore 'in' query limit = 10)
    const BATCH_SIZE = 10
    const allTickets: any[] = []
    
    for (let i = 0; i < eventIds.length; i += BATCH_SIZE) {
      const batch = eventIds.slice(i, i + BATCH_SIZE)
      const ticketsSnapshot = await adminDb
        .collection('tickets')
        .where('event_id', 'in', batch)
        .where('status', '==', 'valid')  // Exclude cancelled/refunded
        .get()
      
      ticketsSnapshot.docs.forEach((doc: any) => {
        allTickets.push({ id: doc.id, ...doc.data() })
      })
    }

    // Step 4: Filter out tickets already paid out (idempotency safeguard)
    const unpaidTickets = allTickets.filter(t => !paidTicketIds.has(t.id))

    // Step 5: Calculate platform fee (10% default, configurable)
    const PLATFORM_FEE_PERCENT = 10
    const calculateNet = (gross: number) => {
      return Math.floor(gross * (1 - PLATFORM_FEE_PERCENT / 100))
    }

    // Step 6: Separate available vs pending based on event end date
    const now = new Date()
    const SETTLEMENT_DELAY_DAYS = 7  // Funds available 7 days after event ends
    
    let availableAmount = 0
    let pendingAmount = 0
    let totalEarnings = 0
    let earliestPendingDateStr: string | null = null

    unpaidTickets.forEach(ticket => {
      const event = events.find((e: any) => e.id === ticket.event_id)
      if (!event) return

      const grossAmount = Math.round((ticket.price_paid || 0) * 100) // Convert to cents
      const netAmount = calculateNet(grossAmount)
      totalEarnings += netAmount

      const eventEndDate = new Date(event.end_datetime || event.start_datetime)
      const availableDate = new Date(eventEndDate.getTime() + SETTLEMENT_DELAY_DAYS * 24 * 60 * 60 * 1000)

      if (now >= availableDate) {
        // Event ended + settlement period passed → Available
        availableAmount += netAmount
      } else {
        // Event hasn't ended or still in settlement period → Pending
        pendingAmount += netAmount
        const availableDateStr = availableDate.toISOString()
        if (earliestPendingDateStr === null || availableDateStr < earliestPendingDateStr) {
          earliestPendingDateStr = availableDateStr
        }
      }
    })

    return {
      available: availableAmount,
      pending: pendingAmount,
      nextPayoutDate: earliestPendingDateStr,
      totalEarnings,
      currency: primaryCurrency
    }
  } catch (error) {
    console.error('Error calculating balance:', error)
    return { 
      available: 0, 
      pending: 0, 
      nextPayoutDate: null, 
      totalEarnings: 0,
      currency: 'HTG' 
    }
  }
}

/**
 * Get available tickets for payout (not yet included in any payout)
 * 
 * IDEMPOTENCY GUARANTEE: Returns only tickets that haven't been paid out yet.
 */
export async function getAvailableTicketsForPayout(organizerId: string): Promise<{
  tickets: any[]
  totalAmount: number
  periodStart: string | null
  periodEnd: string | null
}> {
  try {
    // Get organizer's events
    const eventsSnapshot = await adminDb
      .collection('events')
      .where('organizer_id', '==', organizerId)
      .get()

    if (eventsSnapshot.empty) {
      return { tickets: [], totalAmount: 0, periodStart: null, periodEnd: null }
    }

    const events = eventsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }))
    const eventIds = events.map((e: any) => e.id)

    // Get already-paid ticket IDs
    const payoutsSnapshot = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payouts')
      .where('status', 'in', ['completed', 'processing'])
      .get()

    const paidTicketIds = new Set<string>()
    payoutsSnapshot.docs.forEach((doc: any) => {
      const ticketIds = doc.data().ticketIds || []
      ticketIds.forEach((id: string) => paidTicketIds.add(id))
    })

    // Query tickets in batches
    const BATCH_SIZE = 10
    const allTickets: any[] = []
    
    for (let i = 0; i < eventIds.length; i += BATCH_SIZE) {
      const batch = eventIds.slice(i, i + BATCH_SIZE)
      const ticketsSnapshot = await adminDb
        .collection('tickets')
        .where('event_id', 'in', batch)
        .where('status', '==', 'valid')
        .get()
      
      ticketsSnapshot.docs.forEach((doc: any) => {
        const ticket = { id: doc.id, ...doc.data() }
        const event = events.find((e: any) => e.id === ticket.event_id)
        
        // Only include if:
        // 1. Not already paid out
        // 2. Event has ended + settlement period passed
        if (!paidTicketIds.has(ticket.id) && event) {
          const eventEndDate = new Date(event.end_datetime || event.start_datetime)
          const availableDate = new Date(eventEndDate.getTime() + 7 * 24 * 60 * 60 * 1000)
          
          if (new Date() >= availableDate) {
            allTickets.push({ ...ticket, event })
          }
        }
      })
    }

    if (allTickets.length === 0) {
      return { tickets: [], totalAmount: 0, periodStart: null, periodEnd: null }
    }

    // Calculate total with platform fee
    const PLATFORM_FEE_PERCENT = 10
    const totalAmount = allTickets.reduce((sum, t) => {
      const gross = Math.round((t.price_paid || 0) * 100)
      const net = Math.floor(gross * (1 - PLATFORM_FEE_PERCENT / 100))
      return sum + net
    }, 0)

    // Find period range
    const purchaseDates = allTickets
      .map(t => new Date(t.purchased_at))
      .sort((a, b) => a.getTime() - b.getTime())
    
    const periodStart = purchaseDates[0]?.toISOString() || null
    const periodEnd = purchaseDates[purchaseDates.length - 1]?.toISOString() || null

    return {
      tickets: allTickets,
      totalAmount,
      periodStart,
      periodEnd
    }
  } catch (error) {
    console.error('Error fetching available tickets:', error)
    return { tickets: [], totalAmount: 0, periodStart: null, periodEnd: null }
  }
}

// Helper functions
function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber
  return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4)
}

function maskPhoneNumber(phoneNumber: string): string {
  if (phoneNumber.length <= 4) return phoneNumber
  return '*'.repeat(phoneNumber.length - 4) + phoneNumber.slice(-4)
}
