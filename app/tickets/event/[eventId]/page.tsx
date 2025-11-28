import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
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

export default async function EventTicketsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login')
  }

  const { eventId } = await params
  
  // Validate eventId
  if (!eventId) {
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

      // Get event details
      const { data: allEvents } = await supabase
        .from('events')
        .select('*')

      event = allEvents?.find((e: any) => e && e.id === eventId)
      
      tickets = userEventTickets
    }
  } catch (err) {
    console.error('Error fetching tickets/event:', err instanceof Error ? err.message : String(err))
    // Set empty values to show not found
    tickets = []
    event = null
  }

  if (!event || !tickets || tickets.length === 0) {
    notFound()
  }

  // Serialize ALL Firestore Timestamps recursively
  const serializedEvent = serializeTimestamps(event)
  const serializedTickets = tickets.map(ticket => serializeTimestamps(ticket))

  // Additional validation
  const validTickets = serializedTickets.filter(t => t && !t.checked_in_at && t.status === 'valid')
  const usedTickets = serializedTickets.filter(t => t && t.checked_in_at)

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        
        {/* Event Hero Card - Compact Mobile */}
        <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          {/* Banner Image - Compact */}
          {serializedEvent.banner_image_url ? (
            <div className="relative h-32 sm:h-48 md:h-56 bg-gradient-to-br from-brand-600 to-accent-500">
              <img
                src={serializedEvent.banner_image_url}
                alt={serializedEvent.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </div>
          ) : (
            <div className="h-32 sm:h-48 md:h-56 bg-gradient-to-br from-brand-600 via-brand-500 to-accent-500 relative overflow-hidden">
              <div className="absolute top-10 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-10 left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
            </div>
          )}

          {/* Event Info - Compact */}
          <div className="p-4 md:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="success" size="md" icon={<Sparkles className="w-3.5 h-3.5" />}>
                    {serializedTickets.length} Ticket{serializedTickets.length !== 1 ? 's' : ''}
                  </Badge>
                  {validTickets.length > 0 && (
                    <Badge variant="primary" size="sm">
                      {validTickets.length} Active
                    </Badge>
                  )}
                </div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 line-clamp-2">{String(serializedEvent.title || 'Event')}</h1>
                <p className="text-[13px] md:text-sm text-gray-600">Your tickets are ready to use</p>
              </div>
            </div>

            {/* Event Details Grid - Compact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 md:p-4 bg-gradient-to-br from-brand-50 to-brand-100 rounded-lg border border-brand-200">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] md:text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1">Date & Time</p>
                  {serializedEvent.start_datetime ? (
                    <>
                      <p className="text-sm md:text-base font-bold text-gray-900 truncate">
                        {format(new Date(serializedEvent.start_datetime), 'EEE, MMM d, yyyy')}
                      </p>
                      <p className="text-[13px] text-gray-600 truncate">
                        {serializedEvent.end_datetime 
                          ? `${format(new Date(serializedEvent.start_datetime), 'h:mm a')} - ${format(new Date(serializedEvent.end_datetime), 'h:mm a')}`
                          : format(new Date(serializedEvent.start_datetime), 'h:mm a')
                        }
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm md:text-base font-bold text-gray-900">Date TBA</p>
                      <p className="text-[13px] text-gray-600">Time TBA</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 md:p-4 bg-gradient-to-br from-accent-50 to-accent-100 rounded-lg border border-accent-200">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-accent-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] md:text-xs font-semibold text-accent-600 uppercase tracking-wider mb-1">Venue</p>
                  <p className="text-sm md:text-base font-bold text-gray-900 truncate">{String(serializedEvent.venue_name || 'Venue TBA')}</p>
                  <p className="text-[13px] text-gray-600 truncate">{String(serializedEvent.commune || 'Location')}, {String(serializedEvent.city || 'TBA')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Tickets Section */}
        {validTickets.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                <TicketIcon className="w-5 h-5 md:w-6 md:h-6 text-brand-600" />
                Active Tickets
              </h2>
              <Badge variant="success" size="sm">
                {validTickets.length} Ready
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {validTickets.map((ticket, index) => (
                <div
                  key={ticket.id}
                  className="group relative bg-white rounded-xl shadow-sm border border-gray-200 hover:border-brand-400 hover:shadow-md transition-all overflow-visible"
                >
                  {/* Ticket Number Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <div className="px-2.5 py-0.5 bg-brand-600 text-white text-[11px] font-bold rounded-full shadow-lg">
                      #{index + 1}
                    </div>
                  </div>

                  {/* Gradient Header */}
                  <div className="relative h-1.5 bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500" />

                  {/* QR Code Section - Larger on mobile */}
                  <div className="p-4 md:p-6 text-center">
                    <div className="inline-block p-4 md:p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-inner border border-gray-100">
                      {ticket.qr_code_data ? (
                        <div className="w-[240px] h-[240px] sm:w-[200px] sm:h-[200px]">
                          <QRCodeDisplay value={ticket.qr_code_data} size={240} />
                        </div>
                      ) : (
                        <div className="w-[240px] h-[240px] sm:w-[200px] sm:h-[200px] flex items-center justify-center bg-gray-100 rounded-lg">
                          <p className="text-sm text-gray-500">QR Code Unavailable</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 space-y-0.5">
                      <p className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket ID</p>
                      <p className="text-[11px] md:text-xs font-mono text-gray-900">{ticket.id ? ticket.id.slice(0, 16) + '...' : 'N/A'}</p>
                    </div>
                  </div>

                  {/* Action Buttons - Compact */}
                  <div className="p-3 md:p-4 border-t border-dashed border-gray-200 bg-gray-50 space-y-2">
                    {!isDemoMode() && (
                      <>
                        <AddToWalletButton
                          ticket={ticket}
                          event={serializedEvent}
                        />
                        
                        <a
                          href={`/tickets/${ticket.id}`}
                          className="group/btn flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-brand-400 text-sm font-semibold rounded-lg transition-all"
                        >
                          <Share2 className="w-4 h-4" />
                          Transfer Ticket
                          <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </a>
                      </>
                    )}
                  </div>

                  {/* Purchase Info */}
                  <div className="px-3 pb-3">
                    <p className="text-[11px] text-gray-500 text-center">
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
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                Used Tickets
              </h2>
              <Badge variant="neutral" size="sm">
                {usedTickets.length} Used
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {usedTickets.map((ticket, index) => (
                <div
                  key={ticket.id}
                  className="relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden opacity-75"
                >
                  <div className="absolute top-3 right-3 z-10">
                    <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
                      Used
                    </Badge>
                  </div>

                  <div className="relative h-1.5 bg-gradient-to-r from-gray-300 to-gray-400" />

                  <div className="p-4 md:p-6 text-center">
                    <div className="inline-block p-4 md:p-6 bg-gray-100 rounded-xl border border-gray-200">
                      {ticket.qr_code_data ? (
                        <div className="w-[200px] h-[200px] sm:w-[180px] sm:h-[180px]">
                          <QRCodeDisplay value={ticket.qr_code_data} size={200} />
                        </div>
                      ) : (
                        <div className="w-[200px] h-[200px] sm:w-[180px] sm:h-[180px] flex items-center justify-center bg-gray-200 rounded-lg">
                          <p className="text-sm text-gray-500">QR Code Used</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                        Checked In
                      </Badge>
                      <p className="text-[13px] text-gray-600">
                        {ticket.checked_in_at ? format(new Date(ticket.checked_in_at), 'MMM d, yyyy • h:mm a') : 'Used'}
                      </p>
                    </div>
                  </div>

                  <div className="px-3 pb-3">
                    <p className="text-[11px] text-gray-500 text-center font-mono">
                      {ticket.id ? ticket.id.slice(0, 16) + '...' : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help & Instructions - Compact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-blue-900 mb-0.5">How to Use</h3>
                <p className="text-[13px] text-blue-700">Show your QR code at the entrance</p>
              </div>
            </div>
            <ul className="space-y-1.5 text-[13px] text-blue-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-600" />
                <span>Each ticket has a unique QR code</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-600" />
                <span>Can only be scanned once for entry</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-600" />
                <span>Works both digital and printed</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-purple-900 mb-0.5">Save to Wallet</h3>
                <p className="text-[13px] text-purple-700">Quick access on event day</p>
              </div>
            </div>
            <ul className="space-y-1.5 text-[13px] text-purple-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-purple-600" />
                <span>Add to Apple Wallet or Google Pay</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-purple-600" />
                <span>Access tickets offline anytime</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-purple-600" />
                <span>Get event reminders automatically</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Quick Actions - Compact */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <a
            href={`/events/${eventId}`}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-brand-400 text-sm font-semibold rounded-lg transition-all"
          >
            View Event Details
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/tickets"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            All My Tickets
            <TicketIcon className="w-4 h-4" />
          </a>
        </div>
      </div>
      
      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
