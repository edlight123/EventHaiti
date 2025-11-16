import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function OrganizerDashboard() {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login')
  }

  // Redirect to My Events page
  redirect('/organizer/events')
}
