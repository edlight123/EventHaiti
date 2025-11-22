import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { redirect, notFound } from 'next/navigation'
import EventForm from '../../EventForm'
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Event</h1>
        <EventForm userId={user.id} event={event} />
      </div>
    </div>
  )
}
