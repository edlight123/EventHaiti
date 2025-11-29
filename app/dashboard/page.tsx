import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import { Calendar, Heart, Ticket, TrendingUp } from 'lucide-react'
import { isDemoMode, DEMO_EVENTS, DEMO_TICKETS } from '@/lib/demo'
import { NextEventHero } from '@/components/dashboard/NextEventHero'
import { TicketsPreview } from '@/components/dashboard/TicketsPreview'
import { FavoritesRow } from '@/components/dashboard/FavoritesRow'
import { UpcomingListCompact } from '@/components/dashboard/UpcomingListCompact'
import { Suspense } from 'react'

export const revalidate = 0

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  let upcomingEvents: any[] = []
  let allUpcomingEvents: any[] = []
  let favoriteEvents: any[] = []
  let ticketPreviews: any[] = []
  let totalTickets = 0
  let nextEvent: any = null

  const supabase = await createClient()
  const now = new Date()

  if (isDemoMode()) {
    allUpcomingEvents = DEMO_EVENTS.filter(e => new Date(e.start_datetime) > now)
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
    
    upcomingEvents = allUpcomingEvents.slice(0, 3)
    nextEvent = allUpcomingEvents[0] || null
    totalTickets = DEMO_TICKETS.length
    
    ticketPreviews = allUpcomingEvents.slice(0, 3).map(event => ({
      eventId: event.id,
      eventTitle: event.title,
      eventBanner: event.banner_image_url,
      eventDate: event.start_datetime,
      eventVenue: event.venue_name,
      eventCity: event.city,
      ticketCount: 1,
      status: 'active' as const
    }))
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

    // Separate upcoming events
    allUpcomingEvents = ticketedEvents
      .filter((e: any) => new Date(e.start_datetime) > now)
      .sort((a: any, b: any) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
    
    upcomingEvents = allUpcomingEvents.slice(0, 3)
    nextEvent = allUpcomingEvents[0] || null

    // Create ticket previews
    ticketPreviews = allUpcomingEvents.slice(0, 3).map(event => {
      const eventTickets = userTickets.filter((t: any) => t.event_id === event.id)
      return {
        eventId: event.id,
        eventTitle: event.title,
        eventBanner: event.banner_image_url,
        eventDate: event.start_datetime,
        eventVenue: event.venue_name,
        eventCity: event.city,
        ticketCount: eventTickets.length,
        status: 'active' as const
      }
    })

    // Fetch favorites
    try {
      const { data: allFavorites } = await supabase
        .from('favorites')
        .select('*')
      
      const userFavorites = allFavorites?.filter((f: any) => f.user_id === user.id) || []
      
      if (userFavorites.length > 0) {
        const favoriteEventIds = userFavorites.map((f: any) => f.event_id)
        const { data: allEvents } = await supabase.from('events').select('*')
        favoriteEvents = allEvents?.filter((e: any) => favoriteEventIds.includes(e.id)) || []
      } else {
        favoriteEvents = []
      }
    } catch (error) {
      console.error('Error fetching favorites:', error)
      favoriteEvents = []
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {user.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-base sm:text-lg text-gray-600">Your event journey at a glance</p>
        </div>

        {/* Next Event Hero */}
        {nextEvent && (
          <Suspense fallback={<div className="h-80 bg-gray-200 rounded-3xl animate-pulse mb-8" />}>
            <NextEventHero event={nextEvent} />
          </Suspense>
        )}

        {/* Stats Cards - Now Clickable */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-8 mt-8">
          <Link
            href="/tickets"
            className="bg-white rounded-xl shadow-soft border border-gray-100 p-4 hover:shadow-lg hover:border-brand-200 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Upcoming Events</h3>
              <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                <Calendar className="w-5 h-5 text-brand-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-brand-700 mb-1">{allUpcomingEvents.length}</p>
            <p className="text-xs text-gray-600">
              {allUpcomingEvents.length > 0 && nextEvent
                ? `Next: ${new Date(nextEvent.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'No upcoming events'}
            </p>
          </Link>

          <Link
            href="/tickets"
            className="bg-white rounded-xl shadow-soft border border-gray-100 p-4 hover:shadow-lg hover:border-purple-200 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Tickets</h3>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                <Ticket className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-purple-700 mb-1">{totalTickets}</p>
            <p className="text-xs text-gray-600">
              {totalTickets > 0 ? `${totalTickets} active ${totalTickets === 1 ? 'ticket' : 'tickets'}` : 'No tickets yet'}
            </p>
          </Link>

          <Link
            href="/favorites"
            className="bg-white rounded-xl shadow-soft border border-gray-100 p-4 hover:shadow-lg hover:border-pink-200 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Favorites</h3>
              <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                <Heart className="w-5 h-5 text-pink-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-pink-700 mb-1">{favoriteEvents.length}</p>
            <p className="text-xs text-gray-600">
              {favoriteEvents.length > 0 ? `${favoriteEvents.length} saved ${favoriteEvents.length === 1 ? 'event' : 'events'}` : 'No favorites yet'}
            </p>
          </Link>
        </div>

        {/* My Tickets Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">My Tickets</h2>
            <Link href="/tickets" className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 text-sm">
              View all
              <TrendingUp className="w-4 h-4" />
            </Link>
          </div>
          <Suspense fallback={<div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />)}</div>}>
            <TicketsPreview tickets={ticketPreviews} />
          </Suspense>
        </div>

        {/* Favorites Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Saved Events</h2>
            {favoriteEvents.length > 0 && (
              <Link href="/favorites" className="text-pink-600 hover:text-pink-700 font-semibold flex items-center gap-1 text-sm">
                View all
                <TrendingUp className="w-4 h-4" />
              </Link>
            )}
          </div>
          <Suspense fallback={<div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />}>
            <FavoritesRow favorites={favoriteEvents} />
          </Suspense>
        </div>

        {/* Upcoming Events Compact List */}
        {!nextEvent && allUpcomingEvents.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
              <Link href="/tickets" className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 text-sm">
                View all
                <TrendingUp className="w-4 h-4" />
              </Link>
            </div>
            <Suspense fallback={<div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}</div>}>
              <UpcomingListCompact events={allUpcomingEvents} />
            </Suspense>
          </div>
        )}
      </div>

      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
