import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { redirect, notFound } from 'next/navigation'
import { format } from 'date-fns'
import QRCodeDisplay from '@/app/tickets/[id]/QRCodeDisplay'
import AddToWalletButton from '@/components/AddToWalletButton'
import { isDemoMode, DEMO_TICKETS, DEMO_EVENTS } from '@/lib/demo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EventTicketsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login')
  }

  const { eventId } = await params
  let tickets: any[] = []
  let event: any = null

  if (isDemoMode()) {
    // Find demo tickets for this event
    const demoTickets = DEMO_TICKETS.filter(t => t.event_id === eventId && t.attendee_id === user.id)
    event = DEMO_EVENTS.find(e => e.id === eventId)
    tickets = demoTickets
  } else {
    // Fetch real tickets from database
    const supabase = await createClient()
    
    // Get all tickets and filter
    const { data: allTickets } = await supabase
      .from('tickets')
      .select('*')

    const userEventTickets = allTickets?.filter((t: any) => 
      t.event_id === eventId && t.attendee_id === user.id
    ) || []

    // Get event details
    const { data: allEvents } = await supabase
      .from('events')
      .select('*')

    event = allEvents?.find((e: any) => e.id === eventId)
    tickets = userEventTickets
  }

  if (!event || tickets.length === 0) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Event Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          {event.banner_image_url && (
            <div className="h-48 bg-gray-200">
              <img
                src={event.banner_image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{event.title}</h1>
            
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

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-900">
                You have {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} for this event
              </p>
            </div>
          </div>
        </div>

        {/* Tickets Grid - Scrollable */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Your Tickets</h2>
          
          <div className="space-y-4">
            {tickets.map((ticket, index) => (
              <div
                key={ticket.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
              >
                {/* Ticket Header */}
                <div className="bg-gradient-to-r from-teal-700 to-orange-600 text-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">Ticket {index + 1} of {tickets.length}</h3>
                      <p className="text-sm text-teal-50">Show this QR code at entrance</p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        ticket.status === 'valid'
                          ? 'bg-white text-teal-700'
                          : ticket.checked_in_at
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-red-200 text-red-800'
                      }`}
                    >
                      {ticket.checked_in_at ? 'Checked In' : ticket.status === 'valid' ? 'Valid' : ticket.status}
                    </span>
                  </div>
                </div>

                {/* QR Code */}
                <div className="p-8 text-center bg-white">
                  <div className={`inline-block p-6 rounded-2xl ${
                    ticket.checked_in_at ? 'bg-gray-100' : 'bg-white'
                  }`}>
                    <QRCodeDisplay value={ticket.qr_code_data} size={256} />
                  </div>

                  {ticket.checked_in_at && (
                    <p className="text-sm text-gray-600 mt-4">
                      ✓ Checked in {format(new Date(ticket.checked_in_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}

                  <div className="mt-4 text-xs text-gray-500">
                    Ticket ID: {ticket.id}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Purchased: {format(new Date(ticket.purchased_at), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>

                {/* Add to Wallet Button */}
                {!isDemoMode() && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <AddToWalletButton
                      ticket={ticket}
                      event={event}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📱 How to use your tickets</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Each ticket has a unique QR code</li>
            <li>• Scroll to see all your tickets for this event</li>
            <li>• Save tickets to your wallet for easy access</li>
            <li>• Show each QR code at the venue entrance</li>
            <li>• Each ticket can only be used once</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
