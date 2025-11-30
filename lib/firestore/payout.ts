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

    return {
      status: data.status || 'not_setup',
      method: data.method,
      bankDetails: data.bankDetails,
      mobileMoneyDetails: data.mobileMoneyDetails,
      verificationStatus: data.verificationStatus,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt)
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
 * Calculate organizer balance
 */
export async function getOrganizerBalance(organizerId: string): Promise<{
  available: number
  pending: number
  nextPayoutDate: string | null
}> {
  try {
    // Get all completed tickets for this organizer's events
    // This is a simplified version - in production you'd query tickets properly
    const eventsSnapshot = await adminDb
      .collection('events')
      .where('organizer_id', '==', organizerId)
      .get()

    const eventIds = eventsSnapshot.docs.map((doc: any) => doc.id)

    if (eventIds.length === 0) {
      return { available: 0, pending: 0, nextPayoutDate: null }
    }

    // For now, return placeholder values
    // In production, you'd calculate from actual ticket sales
    return {
      available: 0,
      pending: 0,
      nextPayoutDate: null
    }
  } catch (error) {
    console.error('Error calculating balance:', error)
    return { available: 0, pending: 0, nextPayoutDate: null }
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
