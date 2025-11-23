import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { redirect, notFound } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import EventUpdates from './EventUpdates'
import NotifyAttendeesButton from './NotifyAttendeesButton'
import TicketTiersManager from '@/components/TicketTiersManager'
import { isDemoMode, DEMO_EVENTS, DEMO_TICKETS } from '@/lib/demo'

export const revalidate = 0

export default async function OrganizerEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login')
  }

  const { id } = await params
  let event: any = null
  let tickets: any[] = []

  if (isDemoMode()) {
    // Find demo event
    event = DEMO_EVENTS.find(e => e.id === id)
    if (!event) {
      notFound()
    }
    
    // Get demo tickets for this event
    tickets = DEMO_TICKETS
      .filter(t => t.event_id === id)
      .map(t => ({
        ...t,
        users: {
          full_name: 'Demo Attendee',
          email: 'demo-attendee@eventhaiti.com',
          phone_number: '+509 1234-5678'
        }
      }))
  } else {
    // Fetch from database
    const supabase = await createClient()
    const allEventsQuery = await supabase
      .from('events')
      .select('*')

    const allEvents = allEventsQuery.data || []
    event = allEvents.find((e: any) => e.id === id && e.organizer_id === user.id) || null

    if (!event) {
      notFound()
    }

    // Get tickets for this event (no joins)
    const allTicketsQuery = await supabase
      .from('tickets')
      .select('*')
    
    const allTickets = allTicketsQuery.data || []
    const eventTickets = allTickets.filter((t: any) => t.event_id === event.id)
    
    // Sort by purchased_at descending
    eventTickets.sort((a: any, b: any) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime())
    
    // Get user data separately
    const allUsersQuery = await supabase
      .from('users')
      .select('id, full_name, email, phone_number')
    
    const allUsers = allUsersQuery.data || []
    const usersMap = new Map()
    allUsers.forEach((u: any) => {
      usersMap.set(u.id, u)
    })
    
    // Attach user data to tickets
    tickets = eventTickets.map((t: any) => ({
      ...t,
      users: usersMap.get(t.attendee_id) || { full_name: 'Unknown', email: '', phone_number: '' }
    }))
  }

  const revenue = (event.tickets_sold || 0) * Number(event.ticket_price || 0)
  const remainingTickets = (event.total_tickets || 0) - (event.tickets_sold || 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
            <div className="flex gap-3">
              <NotifyAttendeesButton eventId={event.id} />
              <a
                href={`/api/events/${event.id}/export-attendees`}
                download
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download List
              </a>
              <Link
                href={`/organizer/events/${event.id}/check-in`}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Scan Tickets
              </Link>
              <Link
                href={`/organizer/events/${event.id}/edit`}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium"
              >
                Edit Event
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
              event.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {event.is_published ? 'Published' : 'Draft'}
            </span>
            <span className="text-sm text-gray-600">{event.category}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Tickets Sold</p>
            <p className="text-3xl font-bold text-gray-900">{event.tickets_sold || 0}</p>
            <p className="text-xs text-gray-500">of {event.total_tickets || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Remaining</p>
            <p className="text-3xl font-bold text-gray-900">{Math.max(0, remainingTickets)}</p>
            <p className="text-xs text-gray-500">tickets</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Revenue</p>
            <p className="text-3xl font-bold text-gray-900">{revenue.toFixed(0)}</p>
            <p className="text-xs text-gray-500">HTG</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Ticket Price</p>
            <p className="text-3xl font-bold text-gray-900">{event.ticket_price || 0}</p>
            <p className="text-xs text-gray-500">HTG</p>
          </div>
        </div>

        {/* Ticket Tiers Management */}
        {!isDemoMode() && (
          <div className="mb-8">
            <TicketTiersManager eventId={event.id} />
          </div>
        )}

        {/* Event Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Event Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Date & Time</p>
              <p className="font-semibold text-gray-900">
                {format(new Date(event.start_datetime), 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-sm text-gray-600">
                {format(new Date(event.start_datetime), 'h:mm a')} - {format(new Date(event.end_datetime), 'h:mm a')}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Location</p>
              <p className="font-semibold text-gray-900">{event.venue_name}</p>
              <p className="text-sm text-gray-600">{event.address}</p>
              <p className="text-sm text-gray-600">{event.commune}, {event.city}</p>
            </div>

            <div className="md:col-span-2">
              <p className="text-sm text-gray-600 mb-1">Description</p>
              <p className="text-gray-900 whitespace-pre-wrap">{event.description}</p>
            </div>
          </div>
        </div>

        {/* Event Updates */}
        {!isDemoMode() && tickets && tickets.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Send Announcement
            </h2>
            <p className="text-gray-600 mb-6">
              Notify all {tickets.length} ticket holder{tickets.length !== 1 ? 's' : ''} about important updates
            </p>
            <EventUpdates eventId={event.id} eventTitle={event.title} />
          </div>
        )}

        {/* Attendees List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Attendees ({tickets?.length || 0})
          </h2>

          {tickets && tickets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Purchased
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.map((ticket) => {
                    const attendee = ticket.users as any
                    return (
                      <tr key={ticket.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {attendee?.full_name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {attendee?.email || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {attendee?.phone_number || 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            ticket.status === 'valid' || ticket.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : ticket.status === 'used'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {format(new Date(ticket.purchased_at), 'MMM d, yyyy')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No tickets sold yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
