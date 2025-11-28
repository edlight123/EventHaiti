import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import EmptyState from '@/components/EmptyState'
import { redirect } from 'next/navigation'
import { isDemoMode, DEMO_TICKETS, DEMO_EVENTS } from '@/lib/demo'
import { Ticket, TrendingUp } from 'lucide-react'
import TicketCard from './TicketCard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MyTicketsPage() {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login')
  }

  let eventsWithTickets: any[] = []

  if (isDemoMode()) {
    // Group demo tickets by event
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
        ticketCount: tickets.length
      }
    })
  } else {
    // Fetch real tickets from database
    const supabase = await createClient()
    console.log('=== FETCHING TICKETS ===')
    console.log('User ID:', user.id)
    
    try {
      // Get ALL tickets first, then filter in memory
      const allTicketsQuery = await supabase
        .from('tickets')
        .select('*')
      
      const allTicketsData = allTicketsQuery.data
      console.log('ALL tickets in database:', allTicketsData?.length || 0)
      
      // Filter for this user
      const ticketsData = allTicketsData?.filter((t: any) => t.attendee_id === user.id) || []
      console.log('Tickets for this user:', ticketsData?.length || 0)
      
      if (!ticketsData || ticketsData.length === 0) {
        console.log('No tickets found for user')
        eventsWithTickets = []
      } else {
        // Get ALL events from database
        const eventsQuery = await supabase
          .from('events')
          .select('*')
        
        const eventsData = eventsQuery.data || []
        
        // Group tickets by event
        const ticketsByEvent = new Map()
        
        ticketsData.forEach((ticket: any) => {
          if (!ticketsByEvent.has(ticket.event_id)) {
            ticketsByEvent.set(ticket.event_id, [])
          }
          ticketsByEvent.get(ticket.event_id).push(ticket)
        })
        
        // Create events with ticket counts
        eventsWithTickets = Array.from(ticketsByEvent.entries()).map(([eventId, tickets]) => {
          const event = eventsData?.find((e: any) => e.id === eventId)
          
          // Serialize Firestore Timestamps to ISO strings
          const serializedEvent = event ? {
            ...event,
            start_datetime: event.start_datetime?.toDate ? event.start_datetime.toDate().toISOString() : event.start_datetime,
            end_datetime: event.end_datetime?.toDate ? event.end_datetime.toDate().toISOString() : event.end_datetime,
            date: event.date?.toDate ? event.date.toDate().toISOString() : event.date,
            created_at: event.created_at?.toDate ? event.created_at.toDate().toISOString() : event.created_at,
            createdAt: event.createdAt?.toDate ? event.createdAt.toDate().toISOString() : event.createdAt,
            updated_at: event.updated_at?.toDate ? event.updated_at.toDate().toISOString() : event.updated_at,
            updatedAt: event.updatedAt?.toDate ? event.updatedAt.toDate().toISOString() : event.updatedAt,
          } : null
          
          return {
            event: serializedEvent,
            // Don't include tickets array to avoid any serialization issues
            ticketCount: (tickets as any[]).length
          }
        }).filter(item => item.event) // Only include items with valid events
        
        console.log('Events with tickets:', eventsWithTickets.length)
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
      eventsWithTickets = []
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Tickets</h1>

        {eventsWithTickets && eventsWithTickets.length > 0 ? (
          <div className="space-y-4">
            {eventsWithTickets.map((item) => {
              const event = item.event
              if (!event || !event.id) {
                return null
              }

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
        ) : (
          <EmptyState
            icon={Ticket}
            title="No tickets yet"
            description="When you purchase tickets, they'll appear here with QR codes for easy check-in."
            actionLabel="Browse Events"
            actionHref="/"
            actionIcon={TrendingUp}
          />
        )}
      </div>
    </div>
  )
}
