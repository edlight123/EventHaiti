import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import { Calendar, Heart, Ticket, TrendingUp, Star, ArrowRight, Sparkles, Clock } from 'lucide-react'
import { isDemoMode, DEMO_EVENTS, DEMO_TICKETS } from '@/lib/demo'

export const revalidate = 0

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  let upcomingEvents: any[] = []
  let pastEvents: any[] = []
  let favoriteEvents: any[] = []
  let totalTickets = 0

  const supabase = await createClient()
  const now = new Date()

  if (isDemoMode()) {
    upcomingEvents = DEMO_EVENTS.filter(e => new Date(e.start_datetime) > now).slice(0, 3)
    pastEvents = DEMO_EVENTS.filter(e => new Date(e.start_datetime) <= now).slice(0, 3)
    totalTickets = DEMO_TICKETS.length
  } else {
    // Fetch user's tickets
    const { data: allTickets } = await supabase.from('tickets').select('*')
    const userTickets = allTickets?.filter((t: any) => t.attendee_id === user.id) || []
    totalTickets = userTickets.length

    // Get event IDs from tickets
    const ticketEventIds = userTickets.map((t: any) => t.event_id)

    // Fetch all events
    const { data: allEvents } = await supabase.from('events').select('*')
    const ticketedEvents = allEvents?.filter((e: any) => ticketEventIds.includes(e.id)) || []

    // Separate upcoming and past
    upcomingEvents = ticketedEvents
      .filter((e: any) => new Date(e.start_datetime) > now)
      .sort((a: any, b: any) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
      .slice(0, 3)
    
    pastEvents = ticketedEvents
      .filter((e: any) => new Date(e.start_datetime) <= now)
      .sort((a: any, b: any) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime())
      .slice(0, 3)

    // Fetch favorites
    try {
      const { data: favorites } = await supabase
        .from('favorites')
        .select('event:events (*)')
        .eq('user_id', user.id)
      
      favoriteEvents = favorites?.map((f: any) => f.event).filter(Boolean).slice(0, 3) || []
    } catch (error) {
      favoriteEvents = []
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            Welcome back, {user.full_name?.split(' ')[0] || 'there'}! 👋
            <Sparkles className="w-8 h-8 text-brand-600" />
          </h1>
          <p className="text-lg text-gray-600">Your event journey at a glance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 hover:shadow-medium transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Upcoming Events</h3>
              <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-brand-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-brand-700 mb-2">{upcomingEvents.length}</p>
            <p className="text-sm text-gray-600">Events you&apos;re attending</p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 hover:shadow-medium transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Tickets</h3>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <Ticket className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-purple-700 mb-2">{totalTickets}</p>
            <p className="text-sm text-gray-600">In your collection</p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 hover:shadow-medium transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Favorites</h3>
              <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-pink-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-pink-700 mb-2">{favoriteEvents.length}</p>
            <p className="text-sm text-gray-600">Events you saved</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/"
              className="group bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-6 text-white hover:shadow-glow transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="w-8 h-8" />
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="font-bold text-lg mb-1">Discover Events</h3>
              <p className="text-brand-100 text-sm">Find your next adventure</p>
            </Link>

            <Link
              href="/tickets"
              className="group bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-brand-500 hover:shadow-medium transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <Ticket className="w-8 h-8 text-purple-600" />
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="font-bold text-lg mb-1 text-gray-900">My Tickets</h3>
              <p className="text-gray-600 text-sm">View all your tickets</p>
            </Link>

            <Link
              href="/favorites"
              className="group bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-pink-500 hover:shadow-medium transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <Heart className="w-8 h-8 text-pink-600" />
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="font-bold text-lg mb-1 text-gray-900">My Favorites</h3>
              <p className="text-gray-600 text-sm">Saved events</p>
            </Link>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-6 h-6 text-brand-600" />
              Upcoming Events
            </h2>
            <Link href="/tickets" className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upcomingEvents.map(event => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden hover:shadow-medium transition-all group"
                >
                  {event.banner_image_url ? (
                    <div className="h-40 bg-gray-200 overflow-hidden">
                      <img src={event.banner_image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center">
                      <span className="text-4xl">🎉</span>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{event.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(event.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <Badge variant="primary" size="sm">Attending</Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">No upcoming events</h3>
              <p className="text-gray-600 mb-4">Discover events happening near you</p>
              <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-accent-600 text-white rounded-xl font-bold hover:shadow-glow transition-all">
                <TrendingUp className="w-5 h-5" />
                Explore Events
              </Link>
            </div>
          )}
        </div>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-6 h-6 text-accent-600" />
              Past Events
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pastEvents.map(event => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden hover:shadow-medium transition-all group opacity-75 hover:opacity-100"
                >
                  {event.banner_image_url ? (
                    <div className="h-40 bg-gray-200 overflow-hidden">
                      <img src={event.banner_image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 grayscale group-hover:grayscale-0" />
                    </div>
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <span className="text-4xl grayscale">🎉</span>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{event.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(event.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <Badge variant="neutral" size="sm">Attended</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
