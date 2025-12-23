'use server'

import { adminAuth } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'
import { updatePayoutConfig as updatePayoutConfigLib } from '@/lib/firestore/payout'
import type { PayoutConfig } from '@/lib/firestore/payout'

export async function updatePayoutConfig(
  updates: Partial<PayoutConfig>
): Promise<{ success: boolean; error?: string; requiresVerification?: boolean }> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (!sessionCookie) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const result = await updatePayoutConfigLib(decodedClaims.uid, updates)
    if (!result?.success) {
      const message = String(result?.error || 'Failed to update payout configuration')
      if (message.includes('PAYOUT_CHANGE_VERIFICATION_REQUIRED')) {
        return { success: false, requiresVerification: true }
      }
      return { success: false, error: message }
    }
    return { success: true }
  } catch (error) {
    const message = String((error as any)?.message || 'Failed to update payout configuration')
    if (message.includes('PAYOUT_CHANGE_VERIFICATION_REQUIRED')) {
      return { success: false, requiresVerification: true }
    }
    console.error('Error updating payout config:', error)
    return { success: false, error: message }
  }
}
