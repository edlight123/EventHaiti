import { isDemoMode, DEMO_TICKETS, DEMO_EVENTS } from '@/lib/demo'
import { createClient } from '@/lib/firebase-db/server'
import TicketCard from '../TicketCard'
import EmptyState from '@/components/EmptyState'
import { Ticket, TrendingUp } from 'lucide-react'

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

  return (
    <div className="space-y-3 md:space-y-4">
      {eventsWithTickets.map((item) => {
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
  )
}
