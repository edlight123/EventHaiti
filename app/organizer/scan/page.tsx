import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/firebase-db/server'
import EventSelector from './EventSelector'

export default async function ScanTicketPage() {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login')
  }

  // Fetch organizer's events
  const supabase = await createClient()
  const allEventsQuery = await supabase.from('events').select('*')
  const allEvents = allEventsQuery.data || []
  const events = allEvents
    .filter((e: any) => e.organizer_id === user.id)
    .sort((a: any, b: any) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Scan Tickets</h1>
          <p className="text-gray-600">
            Select an event, then use your camera to scan attendee QR codes.
          </p>
        </div>

        <EventSelector events={events} organizerId={user.id} />
      </div>
    </div>
  )
}
