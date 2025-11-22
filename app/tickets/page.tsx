import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { isDemoMode, DEMO_TICKETS, DEMO_EVENTS } from '@/lib/demo'

export const revalidate = 0

export default async function MyTicketsPage() {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login')
  }

  let tickets: any[] = []

  if (isDemoMode()) {
    // Return demo tickets with event details
    tickets = DEMO_TICKETS.map(ticket => {
      const event = DEMO_EVENTS.find(e => e.id === ticket.event_id)
      return {
        ...ticket,
        events: event
      }
    })
  } else {
    // Fetch real tickets from database
    const supabase = await createClient()
    console.log('=== FETCHING TICKETS ===')
    console.log('User ID:', user.id)
    console.log('User email:', user.email)
    
    // First, get all tickets for this user
    const { data: ticketsData, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('attendee_id', user.id)
      .order('purchased_at', { ascending: false })
    
    console.log('Raw tickets query result:', {
      count: ticketsData?.length || 0,
      error: ticketsError,
      data: ticketsData
    })
    
    if (!ticketsData || ticketsData.length === 0) {
      console.log('No tickets found for user')
      tickets = []
    } else {
      // Get unique event IDs
      const eventIdsSet = new Set<string>()
      ticketsData.forEach((t: any) => {
        if (t.event_id) {
          eventIdsSet.add(t.event_id)
        }
      })
      const eventIds = Array.from(eventIdsSet)
      
      console.log('Event IDs to fetch:', eventIds)
      
      // Fetch all events (we'll filter in memory)
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
      
      console.log('All events query result:', {
        count: eventsData?.length || 0,
        error: eventsError
      })
      
      // Create event map
      const eventsMap = new Map()
      if (eventsData) {
        eventsData.forEach((event: any) => {
          eventsMap.set(event.id, event)
        })
      }
      
      console.log('Events map size:', eventsMap.size)
      
      // Combine tickets with events
      tickets = ticketsData
        .map((ticket: any) => {
          const event = eventsMap.get(ticket.event_id)
          if (!event) {
            console.log('No event found for ticket:', ticket.id, 'event_id:', ticket.event_id)
          }
          return {
            ...ticket,
            events: event ? {
              id: event.id,
              title: event.title,
              start_datetime: event.start_datetime,
              venue_name: event.venue_name,
              city: event.city,
              banner_image_url: event.banner_image_url
            } : null
          }
        })
        .filter((t: any) => t.events !== null)
      
      console.log('Final combined tickets:', tickets.length)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Tickets</h1>

        {tickets && tickets.length > 0 ? (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const event = ticket.events as any
              if (!event) return null

              return (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
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
                        <span
                          className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                            ticket.status === 'valid' || ticket.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : ticket.status === 'used'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {format(new Date(event.start_datetime), 'EEEE, MMM d, yyyy • h:mm a')}
                        </div>

                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {event.venue_name}, {event.city}
                        </div>

                        <div className="text-xs text-gray-500 mt-2">
                          Purchased {format(new Date(ticket.purchased_at), 'MMM d, yyyy')}
                        </div>
                      </div>

                      <div className="mt-4">
                        <span className="text-teal-700 text-sm font-medium">
                          View QR Code →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">🎟️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No tickets yet</h3>
            <p className="text-gray-600 mb-6">
              When you purchase tickets, they&apos;ll appear here.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium"
            >
              Browse Events
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
