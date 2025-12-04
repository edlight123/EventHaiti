import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import { isDemoMode, DEMO_EVENTS, DEMO_TICKETS } from '@/lib/demo'
import DashboardClient from './DashboardClient'

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
    // Parallelize all data fetching for faster load
    const [ticketsData, favoritesData] = await Promise.all([
      supabase.from('tickets').select('*'),
      supabase.from('event_favorites').select('event_id').eq('user_id', user.id)
    ])

    const userTickets = ticketsData.data?.filter((t: any) => t.attendee_id === user.id) || []
    totalTickets = userTickets.length

    // Get event IDs from tickets and favorites
    const ticketEventIds = userTickets.map((t: any) => t.event_id)
    const favoriteEventIds = favoritesData.data?.map((f: any) => f.event_id) || []
    const allEventIds = [...ticketEventIds, ...favoriteEventIds].filter((id, index, arr) => arr.indexOf(id) === index)

    // Fetch all needed events in one query
    const { data: allEvents } = allEventIds.length > 0
      ? await supabase.from('events').select('*').in('id', allEventIds)
      : { data: [] }

    const ticketedEvents = allEvents?.filter((e: any) => ticketEventIds.includes(e.id)) || []
    favoriteEvents = allEvents?.filter((e: any) => favoriteEventIds.includes(e.id) && e.is_published) || []

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
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />

      <DashboardClient
        userName={user.full_name?.split(' ')[0] || 'there'}
        nextEvent={nextEvent}
        allUpcomingEvents={allUpcomingEvents}
        totalTickets={totalTickets}
        ticketPreviews={ticketPreviews}
        favoriteEvents={favoriteEvents}
      />

      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
