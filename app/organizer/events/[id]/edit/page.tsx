import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import EventFormPremium from '../../EventFormPremium'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login')
  }

  const { id } = await params
  let event: any = null

  if (isDemoMode()) {
    // Find demo event
    event = DEMO_EVENTS.find(e => e.id === id)
    if (!event) {
      notFound()
    }
  } else {
    // Fetch from database
    const supabase = await createClient()
    const allEventsQuery = await supabase
      .from('events')
      .select('*')

    const allEvents = allEventsQuery.data || []
    event = allEvents.find((e: any) => e.id === id && e.organizer_id === user.id) || null

    if (!event) {
      notFound()
    }
  }

  return <EventFormPremium userId={user.id} event={event} />
}
