import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { redirect, notFound } from 'next/navigation'
import { format } from 'date-fns'
import QRCodeDisplay from '@/app/tickets/[id]/QRCodeDisplay'
import AddToWalletButton from '@/components/AddToWalletButton'
import { isDemoMode, DEMO_TICKETS, DEMO_EVENTS } from '@/lib/demo'
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Ticket as TicketIcon, 
  CheckCircle2, 
  Download, 
  Share2, 
  Wallet,
  ChevronRight,
  ArrowRight,
  Sparkles,
  QrCode
} from 'lucide-react'
import Badge from '@/components/ui/Badge'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EventTicketsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login')
  }

  const { eventId } = await params
  
  console.log('=== EVENT TICKETS PAGE ===')
  console.log('Event ID:', eventId)
  console.log('User ID:', user?.id)
  
  // Validate eventId
  if (!eventId) {
    console.error('No eventId provided')
    notFound()
  }

  let tickets: any[] = []
  let event: any = null

  try {
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
        t && t.event_id === eventId && t.attendee_id === user.id
      ) || []

      console.log('Filtered tickets for event:', eventId, 'Count:', userEventTickets.length)

      // Get event details
      const { data: allEvents } = await supabase
        .from('events')
        .select('*')

      event = allEvents?.find((e: any) => e && e.id === eventId)
      
      console.log('Event found:', event ? 'Yes' : 'No', event?.title || 'N/A')
      
      tickets = userEventTickets
    }
  } catch (err) {
    console.error('Error fetching tickets/event:', err)
    console.error('Error details:', err instanceof Error ? err.message : String(err))
    console.error('Stack:', err instanceof Error ? err.stack : 'No stack')
    // Set empty values to show not found
    tickets = []
    event = null
  }

  console.log('=== QUERY RESULTS ===')
  console.log('Event found:', !!event)
  console.log('Event data:', event ? JSON.stringify(event, null, 2) : 'null')
  console.log('Tickets count:', tickets?.length || 0)
  console.log('Tickets data:', tickets ? JSON.stringify(tickets, null, 2) : 'null')

  if (!event || !tickets || tickets.length === 0) {
    console.log('Showing 404 - event or tickets missing')
    notFound()
  }

  // Additional validation
  const validTickets = tickets.filter(t => t && !t.checked_in_at && t.status === 'valid')
  const usedTickets = tickets.filter(t => t && t.checked_in_at)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      <Navbar user={user} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Event Hero Card */}
        <div className="relative bg-white rounded-3xl shadow-hard border border-gray-200 overflow-hidden mb-8">
          {/* Banner Image */}
          {event.banner_image_url ? (
            <div className="relative h-56 sm:h-72 bg-gradient-to-br from-brand-600 to-accent-500">
              <img
                src={event.banner_image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </div>
          ) : (
            <div className="h-56 sm:h-72 bg-gradient-to-br from-brand-600 via-brand-500 to-accent-500 relative overflow-hidden">
              <div className="absolute top-10 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-10 left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
            </div>
          )}

          {/* Event Info */}
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant="success" size="lg" icon={<Sparkles className="w-4 h-4" />}>
                    {tickets.length} Ticket{tickets.length !== 1 ? 's' : ''}
                  </Badge>
                  {validTickets.length > 0 && (
                    <Badge variant="primary" size="md">
                      {validTickets.length} Active
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{event.title}</h1>
                <p className="text-gray-600">Your tickets are ready to use</p>
              </div>
            </div>

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-brand-50 to-brand-100 rounded-xl border border-brand-200">
                <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1">Date & Time</p>
                  {event.start_datetime ? (
                    <>
                      <p className="font-bold text-gray-900">
                        {format(new Date(event.start_datetime), 'EEEE, MMM d, yyyy')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {event.end_datetime 
                          ? `${format(new Date(event.start_datetime), 'h:mm a')} - ${format(new Date(event.end_datetime), 'h:mm a')}`
                          : format(new Date(event.start_datetime), 'h:mm a')
                        }
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-gray-900">Date TBA</p>
                      <p className="text-sm text-gray-600">Time TBA</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-accent-50 to-accent-100 rounded-xl border border-accent-200">
                <div className="w-12 h-12 bg-accent-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-accent-600 uppercase tracking-wider mb-1">Venue</p>
                  <p className="font-bold text-gray-900 truncate">{event.venue_name || 'Venue TBA'}</p>
                  <p className="text-sm text-gray-600 truncate">{event.commune || 'Location'}, {event.city || 'TBA'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Tickets Section */}
        {validTickets.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <TicketIcon className="w-7 h-7 text-brand-600" />
                Active Tickets
              </h2>
              <Badge variant="success" size="md">
                {validTickets.length} Ready
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {validTickets.map((ticket, index) => (
                <div
                  key={ticket.id}
                  className="group relative bg-white rounded-2xl shadow-medium border-2 border-gray-200 hover:border-brand-400 hover:shadow-hard transition-all overflow-visible"
                >
                  {/* Ticket Number Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <div className="px-3 py-1 bg-brand-600 text-white text-xs font-bold rounded-full shadow-lg">
                      #{index + 1}
                    </div>
                  </div>

                  {/* Gradient Header */}
                  <div className="relative h-2 bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500" />

                  {/* QR Code Section */}
                  <div className="p-6 text-center">
                    <div className="inline-block p-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-inner border-2 border-gray-100">
                      {ticket.qr_code_data ? (
                        <QRCodeDisplay value={ticket.qr_code_data} size={200} />
                      ) : (
                        <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-100 rounded-lg">
                          <p className="text-sm text-gray-500">QR Code Unavailable</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket ID</p>
                      <p className="text-sm font-mono text-gray-900">{ticket.id ? ticket.id.slice(0, 16) + '...' : 'N/A'}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-4 border-t-2 border-dashed border-gray-200 bg-gray-50 space-y-2">
                    {!isDemoMode() && (
                      <>
                        <AddToWalletButton
                          ticket={ticket}
                          event={event}
                        />
                        
                        <a
                          href={`/tickets/${ticket.id}`}
                          className="group/btn flex items-center justify-center gap-2 w-full py-3 px-4 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-brand-400 font-semibold rounded-xl transition-all"
                        >
                          <Share2 className="w-4 h-4" />
                          Transfer Ticket
                          <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </a>
                      </>
                    )}
                  </div>

                  {/* Purchase Info */}
                  <div className="px-4 pb-4">
                    <p className="text-xs text-gray-500 text-center">
                      {ticket.purchased_at ? `Purchased ${format(new Date(ticket.purchased_at), 'MMM d, yyyy')}` : 'Ticket'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Used Tickets Section */}
        {usedTickets.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
                Used Tickets
              </h2>
              <Badge variant="neutral" size="md">
                {usedTickets.length} Checked In
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {usedTickets.map((ticket, index) => (
                <div
                  key={ticket.id}
                  className="relative bg-white rounded-2xl shadow-soft border-2 border-gray-200 overflow-hidden opacity-75"
                >
                  <div className="absolute top-4 right-4 z-10">
                    <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
                      Used
                    </Badge>
                  </div>

                  <div className="relative h-2 bg-gradient-to-r from-gray-300 to-gray-400" />

                  <div className="p-6 text-center">
                    <div className="inline-block p-6 bg-gray-100 rounded-2xl border-2 border-gray-200">
                      {ticket.qr_code_data ? (
                        <QRCodeDisplay value={ticket.qr_code_data} size={180} />
                      ) : (
                        <div className="w-[180px] h-[180px] flex items-center justify-center bg-gray-200 rounded-lg">
                          <p className="text-sm text-gray-500">QR Code Used</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      <Badge variant="success" size="md" icon={<CheckCircle2 className="w-4 h-4" />}>
                        Checked In
                      </Badge>
                      <p className="text-sm text-gray-600">
                        {ticket.checked_in_at ? format(new Date(ticket.checked_in_at), 'MMM d, yyyy • h:mm a') : 'Used'}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <p className="text-xs text-gray-500 text-center font-mono">
                      {ticket.id ? ticket.id.slice(0, 16) + '...' : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help & Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-blue-900 mb-1">How to Use</h3>
                <p className="text-sm text-blue-700">Show your QR code at the entrance</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                <span>Each ticket has a unique QR code</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                <span>Can only be scanned once for entry</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                <span>Works both digital and printed</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-purple-900 mb-1">Save to Wallet</h3>
                <p className="text-sm text-purple-700">Quick access on event day</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-purple-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-600" />
                <span>Add to Apple Wallet or Google Pay</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-600" />
                <span>Access tickets offline anytime</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-600" />
                <span>Get event reminders automatically</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <a
            href={`/events/${eventId}`}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-brand-400 font-semibold rounded-xl transition-all"
          >
            View Event Details
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/tickets"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            All My Tickets
            <TicketIcon className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  )
}
