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
    await updatePayoutConfigLib(decodedClaims.uid, updates)
  } catch (error) {
    console.error('Error updating payout config:', error)
    throw new Error('Failed to update payout configuration')
  }
}
