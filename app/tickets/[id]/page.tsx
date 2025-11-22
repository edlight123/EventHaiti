import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { redirect, notFound } from 'next/navigation'
import { format } from 'date-fns'
import QRCodeDisplay from './QRCodeDisplay'
import TicketActions from './TicketActions'
import { isDemoMode, DEMO_TICKETS, DEMO_EVENTS } from '@/lib/demo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login')
  }

  const { id } = await params
  let ticket: any = null

  if (isDemoMode()) {
    // Find demo ticket by ID
    const demoTicket = DEMO_TICKETS.find(t => t.id === id)
    if (!demoTicket) {
      notFound()
    }
    
    const event = DEMO_EVENTS.find(e => e.id === demoTicket.event_id)
    ticket = {
      ...demoTicket,
      events: event
    }
  } else {
    // Fetch real ticket from database
    const supabase = await createClient()
    
    // Get all tickets and filter (since .eq() has issues with Firebase wrapper)
    const { data: allTickets } = await supabase
      .from('tickets')
      .select('*')

    const ticketData = allTickets?.find((t: any) => t.id === id && t.attendee_id === user.id)

    if (ticketData) {
      // Get all events and find the matching one
      const { data: allEvents } = await supabase
        .from('events')
        .select('*')

      const eventData = allEvents?.find((e: any) => e.id === ticketData.event_id)

      ticket = {
        ...ticketData,
        events: eventData
      }
    }
  }

  if (!ticket) {
    notFound()
  }

  const event = ticket.events as any

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-700 to-orange-600 text-white p-6">
            <h1 className="text-2xl font-bold mb-2">Your Ticket</h1>
            <p className="text-teal-50">Show this QR code at the venue entrance</p>
          </div>

          {/* QR Code */}
          <div className="p-8 text-center bg-white">
            <div className={`inline-block p-6 rounded-2xl ${
              ticket.status === 'active' ? 'bg-white' : 'bg-gray-100'
            }`}>
              <QRCodeDisplay value={ticket.qr_code_data} size={256} />
            </div>

            <div className="mt-4">
              <span
                className={`inline-block px-4 py-2 text-sm font-semibold rounded-full ${
                  ticket.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : ticket.status === 'used'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {ticket.status === 'active' && 'Valid Ticket'}
                {ticket.status === 'used' && 'Already Used'}
                {ticket.status === 'cancelled' && 'Cancelled'}
              </span>
            </div>

            {ticket.status === 'used' && (
              <p className="text-sm text-gray-600 mt-2">
                This ticket has been scanned and is no longer valid.
              </p>
            )}
          </div>

          {/* Event Details */}
          <div className="p-6 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{event.title}</h2>

            <div className="space-y-3 text-gray-700">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="font-semibold">{format(new Date(event.start_datetime), 'EEEE, MMMM d, yyyy')}</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(event.start_datetime), 'h:mm a')} - {format(new Date(event.end_datetime), 'h:mm a')}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="font-semibold">{event.venue_name}</p>
                  <p className="text-sm text-gray-600">{event.address}</p>
                  <p className="text-sm text-gray-600">{event.commune}, {event.city}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">Ticket ID: {ticket.id}</p>
              <p className="text-xs text-gray-500 mt-1">
                Purchased: {format(new Date(ticket.purchased_at), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>

          {/* Ticket Actions */}
          {!isDemoMode() && (
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-3">Manage Ticket</h3>
              <TicketActions
                ticketId={ticket.id}
                ticketStatus={ticket.status}
                checkedIn={ticket.checked_in || false}
                eventTitle={event.title}
              />
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📱 How to use your ticket</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Save this page or take a screenshot</li>
            <li>• Show the QR code at the venue entrance</li>
            <li>• The organizer will scan your ticket</li>
            <li>• Each ticket can only be used once</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
