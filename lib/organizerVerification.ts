import { createClient } from '@/lib/firebase-db/server'

export type OrganizerVerificationStatus = {
  isVerified: boolean
  status: string | null
}

export async function getOrganizerVerificationStatus(userId: string): Promise<OrganizerVerificationStatus> {
  const db = await createClient()

  // Users row
  const { data: userData } = await db
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  let status: string | null = (userData as any)?.verification_status ?? null
  let isVerified = (userData as any)?.is_verified === true || status === 'approved'

  // Verification request (source of truth for in_review/pending/etc)
  if (!isVerified) {
    const { data: verificationRequest } = await db
      .from('verification_requests')
      .select('*')
      .eq('userId', userId)
      .single()

    if ((verificationRequest as any)?.status) {
      status = (verificationRequest as any).status
    }

    isVerified = isVerified || status === 'approved'
  }

  return { isVerified, status }
}
