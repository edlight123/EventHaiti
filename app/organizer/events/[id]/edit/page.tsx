import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PullToRefresh from '@/components/PullToRefresh'
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
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} />

      <PullToRefresh onRefresh={async () => {
        'use server'
        const { revalidatePath } = await import('next/cache')
        revalidatePath(`/organizer/events/${id}/edit`)
      }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">Edit Event</h1>
          <EventForm userId={user.id} event={event} />
        </div>
      </PullToRefresh>

      <MobileNavWrapper user={user} />
    </div>
  )
}
