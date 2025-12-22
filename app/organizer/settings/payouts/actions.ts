'use server'

import { adminAuth } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'
import { updatePayoutConfig as updatePayoutConfigLib } from '@/lib/firestore/payout'
import type { PayoutConfig } from '@/lib/firestore/payout'

export async function updatePayoutConfig(updates: Partial<PayoutConfig>) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (!sessionCookie) {
    throw new Error('Not authenticated')
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const result = await updatePayoutConfigLib(decodedClaims.uid, updates)
    if (!result?.success) {
      throw new Error(result?.error || 'Failed to update payout configuration')
    }
    return { success: true }
  } catch (error) {
    const message = (error as any)?.message
    // This error is expected when the user must complete step-up verification.
    if (!String(message || '').includes('PAYOUT_CHANGE_VERIFICATION_REQUIRED')) {
      console.error('Error updating payout config:', error)
    }
    // Preserve sentinel errors so the client can trigger step-up verification.
    throw new Error(message || 'Failed to update payout configuration')
  }
}
