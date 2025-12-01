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

    return {
      status: data.status || 'not_setup',
      method: data.method,
      bankDetails: data.bankDetails,
      mobileMoneyDetails: data.mobileMoneyDetails,
      verificationStatus: finalVerificationStatus,
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
