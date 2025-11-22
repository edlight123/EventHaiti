import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function AnalyticsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  const supabase = await createClient()

  // Fetch organizer's events (no joins with Firebase)
  const allEventsQuery = await supabase.from('events').select('*')
  const allEvents = allEventsQuery.data || []
  const eventsData = allEvents.filter((e: any) => e.organizer_id === user.id)

  // Fetch all tickets
  const allTicketsQuery = await supabase.from('tickets').select('*')
  const allTickets = allTicketsQuery.data || []
  
  // Group tickets by event
  const ticketsByEvent = new Map()
  allTickets.forEach((ticket: any) => {
    if (!ticketsByEvent.has(ticket.event_id)) {
      ticketsByEvent.set(ticket.event_id, [])
    }
    ticketsByEvent.get(ticket.event_id).push(ticket)
  })

  // Calculate analytics
  const totalEvents = eventsData.length
  let totalTicketsSold = 0
  let totalRevenue = 0
  
  eventsData.forEach((event: any) => {
    const eventTickets = ticketsByEvent.get(event.id) || []
    totalTicketsSold += eventTickets.length
    totalRevenue += eventTickets.reduce((sum: number, t: any) => sum + (t.price_paid || 0), 0)
  })
  
  const publishedEvents = eventsData.filter((e: any) => e.is_published).length

  // Events with ticket sales
  const eventsWithSales = eventsData.map((event: any) => {
    const eventTickets = ticketsByEvent.get(event.id) || []
    return {
      ...event,
      ticketCount: eventTickets.length,
      revenue: eventTickets.reduce((sum: number, t: any) => sum + (t.price_paid || 0), 0),
    }
  }).sort((a: any, b: any) => b.ticketCount - a.ticketCount)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-2">Track your event performance</p>
          </div>
          <Link
            href="/organizer/events"
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            ← Back to Events
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Events</h3>
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalEvents}</p>
            <p className="text-sm text-gray-500 mt-1">{publishedEvents} published</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Tickets Sold</h3>
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-green-700">{totalTicketsSold}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-orange-700">${totalRevenue.toFixed(2)}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Avg per Event</h3>
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-purple-700">
              {totalEvents > 0 ? (totalTicketsSold / totalEvents).toFixed(1) : '0'}
            </p>
            <p className="text-sm text-gray-500 mt-1">tickets/event</p>
          </div>
        </div>

        {/* Top Performing Events */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Event Performance</h2>
          {eventsWithSales.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No events yet. Create your first event to see analytics!</p>
              <Link
                href="/organizer/events/new"
                className="inline-flex items-center px-6 py-3 mt-4 rounded-full bg-orange-600 text-white font-medium hover:bg-orange-700 transition"
              >
                Create Event
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {eventsWithSales.slice(0, 10).map((event: any) => (
                <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex-1">
                    <Link href={`/organizer/events/${event.id}`} className="font-medium text-gray-900 hover:text-orange-600">
                      {event.title}
                    </Link>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(event.start_datetime).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-8">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Tickets</p>
                      <p className="text-lg font-bold text-gray-900">{event.ticketCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Revenue</p>
                      <p className="text-lg font-bold text-green-700">${event.revenue.toFixed(2)}</p>
                    </div>
                    {!event.is_published && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                        Draft
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
