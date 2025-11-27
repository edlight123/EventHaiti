import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import EmptyState from '@/components/EmptyState'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { isDemoMode, DEMO_TICKETS, DEMO_EVENTS } from '@/lib/demo'
import { Ticket, TrendingUp } from 'lucide-react'

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
          return {
            event,
            tickets,
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
              if (!event) {
                return null
              }

              return (
                <Link
                  key={event.id}
                  href={`/tickets/event/${event.id}`}
                  className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden"
                >
                  <div className="md:flex">
                    {event.banner_image_url ? (
                      <div className="md:w-48 h-48 md:h-auto bg-gray-200">
                        <img
                          src={event.banner_image_url}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="md:w-48 h-48 md:h-auto bg-gradient-to-br from-teal-100 to-orange-100 flex items-center justify-center">
                        <span className="text-4xl">🎟️</span>
                      </div>
                    )}

                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {event.title}
                        </h3>
                        <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {item.ticketCount} {item.ticketCount === 1 ? 'Ticket' : 'Tickets'}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {event.start_datetime ? format(new Date(event.start_datetime), 'EEEE, MMM d, yyyy • h:mm a') : 'Date TBA'}
                        </div>

                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {event.venue_name || 'Venue TBA'}, {event.city || 'Location TBA'}
                        </div>
                      </div>

                      <div className="mt-4">
                        <span className="text-teal-700 text-sm font-medium">
                          View Tickets & QR Codes →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
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
