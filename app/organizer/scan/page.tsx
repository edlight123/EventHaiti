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
  
  // Filter user's events
  const userEvents = allEvents.filter((e: any) => e.organizer_id === user.id)
  
  // Get today's date boundaries
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  // Separate events happening today from others
  const todayEvents = userEvents.filter((e: any) => {
    const eventDate = new Date(e.start_datetime)
    return eventDate >= today && eventDate < tomorrow
  })
  
  const otherEvents = userEvents.filter((e: any) => {
    const eventDate = new Date(e.start_datetime)
    return eventDate < today || eventDate >= tomorrow
  })
  
  // Sort today's events by time (earliest first)
  todayEvents.sort((a: any, b: any) => 
    new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
  )
  
  // Sort other events newest to oldest (by event date)
  otherEvents.sort((a: any, b: any) => 
    new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime()
  )
  
  // Combine: today's events first, then others
  const events = [...todayEvents, ...otherEvents]

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
