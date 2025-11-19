import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { redirect, notFound } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import EventUpdates from './EventUpdates'
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
    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('organizer_id', user.id)
      .single()

    event = eventData

    if (!event) {
      notFound()
    }

    // Get tickets for this event
    const { data: ticketsData } = await supabase
      .from('tickets')
      .select(`
        *,
        users!tickets_attendee_id_fkey(full_name, email, phone_number)
      `)
      .eq('event_id', event.id)
      .order('purchased_at', { ascending: false })
    
    tickets = ticketsData || []
  }

  const revenue = event.tickets_sold * Number(event.ticket_price)
  const remainingTickets = event.total_tickets - event.tickets_sold

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
            <Link
              href={`/organizer/events/${event.id}/edit`}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium"
            >
              Edit Event
            </Link>
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
            <p className="text-3xl font-bold text-gray-900">{event.tickets_sold}</p>
            <p className="text-xs text-gray-500">of {event.total_tickets}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Remaining</p>
            <p className="text-3xl font-bold text-gray-900">{remainingTickets}</p>
            <p className="text-xs text-gray-500">tickets</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Revenue</p>
            <p className="text-3xl font-bold text-gray-900">{revenue.toFixed(0)}</p>
            <p className="text-xs text-gray-500">HTG</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Ticket Price</p>
            <p className="text-3xl font-bold text-gray-900">{event.ticket_price}</p>
            <p className="text-xs text-gray-500">HTG</p>
          </div>
        </div>

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
                            ticket.status === 'active'
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
