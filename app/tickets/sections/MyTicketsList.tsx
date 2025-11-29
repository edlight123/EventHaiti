import { isDemoMode, DEMO_TICKETS, DEMO_EVENTS } from '@/lib/demo'
import { createClient } from '@/lib/firebase-db/server'
import TicketCard from '../TicketCard'
import EmptyState from '@/components/EmptyState'
import { Ticket, TrendingUp, Calendar, Clock } from 'lucide-react'

function serializeTimestamps(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  if (obj.toDate && typeof obj.toDate === 'function') {
    return obj.toDate().toISOString()
  }
  if (Array.isArray(obj)) {
    return obj.map(item => serializeTimestamps(item))
  }
  const serialized: any = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      serialized[key] = serializeTimestamps(obj[key])
    }
  }
  return serialized
}

export default async function MyTicketsList({ userId }: { userId: string }) {
  let eventsWithTickets: any[] = []
  const now = new Date()

  if (isDemoMode()) {
    const ticketsByEvent = new Map()
    DEMO_TICKETS.forEach(ticket => {
      if (!ticketsByEvent.has(ticket.event_id)) {
        ticketsByEvent.set(ticket.event_id, [])
      }
      ticketsByEvent.get(ticket.event_id).push(ticket)
    })

    eventsWithTickets = Array.from(ticketsByEvent.entries()).map(([eventId, tickets]) => {
      const event = DEMO_EVENTS.find(e => e.id === eventId)
      return {
        event,
        tickets,
        ticketCount: (tickets as any[]).length
      }
    })
  } else {
    const supabase = await createClient()
    const allTicketsQuery = await supabase.from('tickets').select('*')
    const allTicketsData = allTicketsQuery.data
    const ticketsData = allTicketsData?.filter((t: any) => t.attendee_id === userId) || []

    if (!ticketsData || ticketsData.length === 0) {
      eventsWithTickets = []
    } else {
      const eventsQuery = await supabase.from('events').select('*')
      const eventsData = eventsQuery.data || []
      const ticketsByEvent = new Map()

      ticketsData.forEach((ticket: any) => {
        if (!ticketsByEvent.has(ticket.event_id)) {
          ticketsByEvent.set(ticket.event_id, [])
        }
        ticketsByEvent.get(ticket.event_id).push(ticket)
      })

      eventsWithTickets = Array.from(ticketsByEvent.entries()).map(([eventId, tickets]) => {
        const event = eventsData?.find((e: any) => e.id === eventId)
        const serializedEvent = event ? serializeTimestamps(event) : null
        return {
          event: serializedEvent,
          ticketCount: (tickets as any[]).length
        }
      }).filter(item => item.event)
    }
  }

  if (!eventsWithTickets || eventsWithTickets.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title="No tickets yet"
        description="When you purchase tickets, they'll appear here with QR codes for easy check-in."
        actionLabel="Browse Events"
        actionHref="/"
        actionIcon={TrendingUp}
      />
    )
  }

  // Separate upcoming and past events
  const upcomingEvents = eventsWithTickets
    .filter(item => new Date(item.event.start_datetime) >= now)
    .sort((a, b) => new Date(a.event.start_datetime).getTime() - new Date(b.event.start_datetime).getTime())

  const pastEvents = eventsWithTickets
    .filter(item => new Date(item.event.start_datetime) < now)
    .sort((a, b) => new Date(b.event.start_datetime).getTime() - new Date(a.event.start_datetime).getTime())

  return (
    <div className="space-y-8">
      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Upcoming Events</h2>
              <p className="text-sm text-gray-600">{upcomingEvents.length} {upcomingEvents.length === 1 ? 'event' : 'events'}</p>
            </div>
          </div>
          <div className="space-y-3 md:space-y-4">
            {upcomingEvents.map((item) => {
              const event = item.event
              if (!event || !event.id) return null
              return (
                <TicketCard
                  key={event.id}
                  eventId={event.id}
                  title={event.title}
                  bannerImageUrl={event.banner_image_url}
                  startDatetime={event.start_datetime}
                  venueName={event.venue_name}
                  city={event.city}
                  ticketCount={item.ticketCount}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Past Events</h2>
              <p className="text-sm text-gray-600">{pastEvents.length} {pastEvents.length === 1 ? 'event' : 'events'}</p>
            </div>
          </div>
          <div className="space-y-3 md:space-y-4 opacity-75">
            {pastEvents.map((item) => {
              const event = item.event
              if (!event || !event.id) return null
              return (
                <TicketCard
                  key={event.id}
                  eventId={event.id}
                  title={event.title}
                  bannerImageUrl={event.banner_image_url}
                  startDatetime={event.start_datetime}
                  venueName={event.venue_name}
                  city={event.city}
                  ticketCount={item.ticketCount}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
