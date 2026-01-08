import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import EventFormPremium from '../EventFormPremium'
import { createClient } from '@/lib/firebase-db/server'
import Navbar from '@/components/Navbar'
import { isAdmin } from '@/lib/admin'
import { getOrganizerVerificationStatus } from '@/lib/organizerVerification'

export const dynamic = 'force-dynamic'

export default async function NewEventPage() {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login?redirect=/organizer/events/new')
  }

  if (user.role !== 'organizer') {
    redirect('/organizer?redirect=/organizer/events/new')
  }

  // Allow event creation (drafts) for everyone; paid publishing is enforced in UI + API.
  // Also avoid expensive "select all users" queries.
  await createClient() // Ensure server db is initialized for this request
  const verification = await getOrganizerVerificationStatus(user.id)

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />
      <EventFormPremium userId={user.id} isVerified={verification.isVerified} verificationStatus={verification.status || undefined} />
    </div>
  )
}
