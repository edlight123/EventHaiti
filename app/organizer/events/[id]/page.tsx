import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PullToRefresh from '@/components/PullToRefresh'
import { redirect, notFound } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import EventUpdates from './EventUpdates'
import NotifyAttendeesButton from './NotifyAttendeesButton'
import TicketTiersManager from '@/components/TicketTiersManager'
import GroupDiscountsManager from '@/components/GroupDiscountsManager'
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
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} />

      <PullToRefresh onRefresh={async () => {
        'use server'
        const { revalidatePath } = await import('next/cache')
        revalidatePath(`/organizer/events/${id}`)
      }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <Link
              href="/organizer/events"
              className="text-orange-600 hover:text-orange-700 text-[13px] md:text-sm font-medium mb-2 inline-block"
            >
              ← Back to Events
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 line-clamp-2">{event.title}</h1>
            <div className="flex items-center space-x-3 mb-4">
              <span className={`inline-block px-2.5 py-1 text-[11px] md:text-sm font-medium rounded-full ${
                event.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {event.is_published ? 'Published' : 'Draft'}
              </span>
              <span className="text-[13px] md:text-sm text-gray-600">{event.category}</span>
            </div>
            
            {/* Quick Actions - horizontal scroll on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              <Link
                href={`/organizer/scan/${event.id}`}
                className="flex-shrink-0 px-3 md:px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-[13px] md:text-sm flex items-center gap-1.5 md:gap-2 whitespace-nowrap shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Check-in
              </Link>
              <Link
                href={`/organizer/events/${event.id}/attendees`}
                className="flex-shrink-0 px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-[13px] md:text-sm flex items-center gap-1.5 md:gap-2 whitespace-nowrap shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Attendees
              </Link>
              <Link
                href={`/organizer/events/${event.id}/edit`}
                className="flex-shrink-0 px-3 md:px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium text-[13px] md:text-sm whitespace-nowrap"
              >
                Edit
              </Link>
              <NotifyAttendeesButton eventId={event.id} />
            </div>
          </div>

          {/* Stats - horizontal scroll on mobile */}
          <div className="flex md:grid md:grid-cols-4 gap-3 md:gap-6 overflow-x-auto -mx-4 px-4 pb-2 snap-x snap-mandatory md:overflow-visible mb-6 md:mb-8">
            <div className="min-w-[200px] md:min-w-0 snap-start bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] md:text-sm font-medium text-gray-600 uppercase tracking-wide">Tickets Sold</h3>
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{event.tickets_sold || 0}</p>
              <p className="text-[11px] md:text-xs text-gray-500">of {event.total_tickets || 0}</p>
            </div>

            <div className="min-w-[200px] md:min-w-0 snap-start bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] md:text-sm font-medium text-gray-600 uppercase tracking-wide">Remaining</h3>
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-orange-700">{Math.max(0, remainingTickets)}</p>
              <p className="text-[11px] md:text-xs text-gray-500">tickets</p>
            </div>

            <div className="min-w-[200px] md:min-w-0 snap-start bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] md:text-sm font-medium text-gray-600 uppercase tracking-wide">Revenue</h3>
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-green-700">{revenue.toFixed(0)}</p>
              <p className="text-[11px] md:text-xs text-gray-500">HTG</p>
            </div>

            <div className="min-w-[200px] md:min-w-0 snap-start bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] md:text-sm font-medium text-gray-600 uppercase tracking-wide">Ticket Price</h3>
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-purple-700">{event.ticket_price || 0}</p>
              <p className="text-[11px] md:text-xs text-gray-500">HTG</p>
            </div>
          </div>

          {/* Ticket Tiers Management */}
          {!isDemoMode() && (
            <div className="mb-6 md:mb-8">
              <TicketTiersManager eventId={event.id} />
            </div>
          )}

          {/* Group Discounts Management */}
          {!isDemoMode() && (
            <div className="mb-6 md:mb-8">
              <GroupDiscountsManager eventId={event.id} />
            </div>
          )}

          {/* Event Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-8 mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Event Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <p className="text-[11px] md:text-sm font-medium text-gray-600 mb-1 uppercase tracking-wide">Date & Time</p>
                <p className="font-semibold text-[13px] md:text-base text-gray-900">
                  {format(new Date(event.start_datetime), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-[13px] md:text-sm text-gray-600">
                  {format(new Date(event.start_datetime), 'h:mm a')} - {format(new Date(event.end_datetime), 'h:mm a')}
                </p>
              </div>

              <div>
                <p className="text-[11px] md:text-sm font-medium text-gray-600 mb-1 uppercase tracking-wide">Location</p>
                <p className="font-semibold text-[13px] md:text-base text-gray-900">{event.venue_name}</p>
                <p className="text-[13px] md:text-sm text-gray-600">{event.address}</p>
                <p className="text-[13px] md:text-sm text-gray-600">{event.commune}, {event.city}</p>
              </div>

              <div className="md:col-span-2">
                <p className="text-[11px] md:text-sm font-medium text-gray-600 mb-1 uppercase tracking-wide">Description</p>
                <p className="text-[13px] md:text-base text-gray-900 whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>
          </div>

          {/* Event Updates */}
          {!isDemoMode() && tickets && tickets.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-8 mb-6 md:mb-8">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">
                Send Announcement
              </h2>
              <p className="text-[13px] md:text-sm text-gray-600 mb-4 md:mb-6">
                Notify all {tickets.length} ticket holder{tickets.length !== 1 ? 's' : ''} about important updates
              </p>
              <EventUpdates eventId={event.id} eventTitle={event.title} />
            </div>
          )}

          {/* Attendees List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-8">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">
              Attendees ({tickets?.length || 0})
            </h2>

            {tickets && tickets.length > 0 ? (
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 md:px-4 py-2.5 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-3 md:px-4 py-2.5 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-3 md:px-4 py-2.5 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">
                        Phone
                      </th>
                      <th className="px-3 md:px-4 py-2.5 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-3 md:px-4 py-2.5 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                        Purchased
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tickets.map((ticket) => {
                      const attendee = ticket.users as any
                      return (
                        <tr key={ticket.id} className="hover:bg-gray-50">
                          <td className="px-3 md:px-4 py-2.5 md:py-3 text-[13px] md:text-sm text-gray-900">
                            {attendee?.full_name || 'N/A'}
                          </td>
                          <td className="px-3 md:px-4 py-2.5 md:py-3 text-[13px] md:text-sm text-gray-600 truncate max-w-[150px]">
                            {attendee?.email || 'N/A'}
                          </td>
                          <td className="px-3 md:px-4 py-2.5 md:py-3 text-[13px] md:text-sm text-gray-600 hidden sm:table-cell">
                            {attendee?.phone_number || 'N/A'}
                          </td>
                          <td className="px-3 md:px-4 py-2.5 md:py-3">
                            <span className={`inline-flex px-2 py-0.5 text-[10px] md:text-xs font-semibold rounded-full ${
                              ticket.status === 'valid' || ticket.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : ticket.status === 'used'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {ticket.status}
                            </span>
                          </td>
                          <td className="px-3 md:px-4 py-2.5 md:py-3 text-[13px] md:text-sm text-gray-600 hidden md:table-cell">
                            {format(new Date(ticket.purchased_at), 'MMM d, yyyy')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-[13px] md:text-sm text-gray-500">
                No tickets sold yet
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>

      <MobileNavWrapper user={user} />
    </div>
  )
}
