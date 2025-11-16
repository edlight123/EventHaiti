import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import EventCard from '@/components/EventCard'
import Navbar from '@/components/Navbar'
import { BRAND } from '@/config/brand'

export const revalidate = 0

export default async function HomePage() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  // Fetch published events
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('is_published', true)
    .gte('start_datetime', new Date().toISOString())
    .order('start_datetime', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-teal-700 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {BRAND.tagline || 'Discover Events in Haiti'}
          </h1>
          <p className="text-xl text-teal-50 max-w-2xl">
            Find and book tickets for concerts, parties, conferences, festivals, and more across Haiti.
          </p>
        </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
          {/* Filter options can be added here */}
        </div>

        {events && events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No events yet</h3>
            <p className="text-gray-600">
              Check back soon for upcoming events!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
