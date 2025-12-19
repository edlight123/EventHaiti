'use server'

import { requireAuth } from '@/lib/auth'
import { updateUserRole } from '@/lib/firestore/user-profile-server'
import { revalidatePath } from 'next/cache'

export async function becomeOrganizer() {
  const { user, error } = await requireAuth()

  if (error || !user) {
    throw new Error('Not authenticated')
  }

  const result = await updateUserRole(user.id, 'organizer')

  if (!result.success) {
    throw new Error(result.error || 'Failed to update role')
  }

  revalidatePath('/organizer')
  revalidatePath('/organizer/events')

  return { success: true }
}
