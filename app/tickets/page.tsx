import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PullToRefresh from '@/components/PullToRefresh'
import EmptyState from '@/components/EmptyState'
import { redirect } from 'next/navigation'
import { isDemoMode, DEMO_TICKETS, DEMO_EVENTS } from '@/lib/demo'
import { Ticket, TrendingUp, Clock, CheckCircle2 } from 'lucide-react'
import TicketCard from './TicketCard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Helper function to serialize all Timestamp objects recursively
function serializeTimestamps(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  
  // Check if it's a Firestore Timestamp
  if (obj.toDate && typeof obj.toDate === 'function') {
    return obj.toDate().toISOString()
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => serializeTimestamps(item))
  }
  
  // Handle plain objects
  const serialized: any = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      serialized[key] = serializeTimestamps(obj[key])
    }
  }
  return serialized
}

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
          
          // Serialize ALL Firestore Timestamps recursively
          const serializedEvent = event ? serializeTimestamps(event) : null
          
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
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />

      <PullToRefresh onRefresh={async () => {
        'use server'
        const { revalidatePath } = await import('next/cache')
        revalidatePath('/tickets')
      }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          {/* Header - Refined */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Tickets</h1>
            <p className="text-sm text-gray-600 mt-1">
              {eventsWithTickets.length > 0 
                ? `${eventsWithTickets.length} event${eventsWithTickets.length !== 1 ? 's' : ''} with tickets`
                : 'No tickets yet'
              }
            </p>
          </div>

        {eventsWithTickets && eventsWithTickets.length > 0 ? (
          <div className="space-y-3 md:space-y-4">
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
      </PullToRefresh>
      
      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
