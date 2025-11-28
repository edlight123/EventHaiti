import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { redirect, notFound } from 'next/navigation'
import { format, isPast } from 'date-fns'
import QRCodeDisplay from './QRCodeDisplay'
import TicketActions from './TicketActions'
import ReviewForm from '@/components/ReviewForm'
import AddToWalletButton from '@/components/AddToWalletButton'
import { isDemoMode, DEMO_TICKETS, DEMO_EVENTS } from '@/lib/demo'
import { 
  Calendar, 
  MapPin, 
  Ticket as TicketIcon, 
  CheckCircle2, 
  XCircle,
  Clock,
  User,
  Hash,
  Download,
  Share2,
  Wallet,
  ArrowLeft,
  Sparkles
} from 'lucide-react'
import Badge from '@/components/ui/Badge'

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
  
  // Convert Firestore Timestamps to plain strings
  const serializedEvent = {
    ...event,
    start_datetime: event.start_datetime?.toDate ? event.start_datetime.toDate().toISOString() : event.start_datetime,
    end_datetime: event.end_datetime?.toDate ? event.end_datetime.toDate().toISOString() : event.end_datetime,
    created_at: event.created_at?.toDate ? event.created_at.toDate().toISOString() : event.created_at,
    updated_at: event.updated_at?.toDate ? event.updated_at.toDate().toISOString() : event.updated_at,
    date: event.date?.toDate ? event.date.toDate().toISOString() : event.date,
  }

  const serializedTicket = {
    ...ticket,
    purchased_at: ticket.purchased_at?.toDate ? ticket.purchased_at.toDate().toISOString() : ticket.purchased_at,
    checked_in_at: ticket.checked_in_at?.toDate ? ticket.checked_in_at.toDate().toISOString() : ticket.checked_in_at,
    created_at: ticket.created_at?.toDate ? ticket.created_at.toDate().toISOString() : ticket.created_at,
    updated_at: ticket.updated_at?.toDate ? ticket.updated_at.toDate().toISOString() : ticket.updated_at,
    events: serializedEvent,
  }
  
  const eventPassed = isPast(new Date(serializedEvent.end_datetime || serializedEvent.start_datetime || serializedEvent.date))
  const isValid = (serializedTicket.status === 'valid' || serializedTicket.status === 'active') && !serializedTicket.checked_in_at

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Back Button */}
        <a
          href="/tickets"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-brand-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">All Tickets</span>
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Ticket Card */}
          <div className="lg:col-span-2">
            <div className="relative bg-white rounded-3xl shadow-hard border-2 border-gray-200 overflow-visible">
              
              {/* Status Banner */}
              <div className={`relative h-2 ${
                isValid 
                  ? 'bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500' 
                  : 'bg-gradient-to-r from-gray-300 to-gray-400'
              }`} />

              {/* Status Badge */}
              <div className="absolute top-6 right-6 z-10">
                {isValid ? (
                  <Badge variant="success" size="lg" icon={<CheckCircle2 className="w-4 h-4" />}>
                    Valid
                  </Badge>
                ) : serializedTicket.checked_in_at ? (
                  <Badge variant="neutral" size="lg" icon={<CheckCircle2 className="w-4 h-4" />}>
                    Used
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="lg" icon={<XCircle className="w-4 h-4" />}>
                    {serializedTicket.status}
                  </Badge>
                )}
              </div>

              {/* QR Code Section */}
              <div className="p-8 sm:p-12 text-center">
                <div className="inline-flex flex-col items-center">
                  <div className={`p-8 rounded-3xl shadow-inner border-2 ${
                    isValid 
                      ? 'bg-gradient-to-br from-gray-50 to-white border-gray-100' 
                      : 'bg-gray-100 border-gray-200'
                  }`}>
                    <QRCodeDisplay value={serializedTicket.qr_code_data} size={280} />
                  </div>

                  <div className="mt-6 space-y-2">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Ticket Code</p>
                    <p className="text-lg font-mono font-bold text-gray-900">{serializedTicket.id.slice(0, 20)}...</p>
                  </div>

                  {serializedTicket.checked_in_at && (
                    <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                      <div className="flex items-center gap-2 text-green-700 mb-1">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-bold">Checked In</span>
                      </div>
                      <p className="text-sm text-green-600">
                        {format(new Date(serializedTicket.checked_in_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Save & Share Actions */}
              {!isDemoMode() && (
                <div className="px-6 pb-6 space-y-3">
                  <AddToWalletButton ticket={ticket} event={event} />
                  
                  {isValid && (
                    <div className="pt-4 border-t-2 border-dashed border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Share2 className="w-4 h-4" />
                        Manage Ticket
                      </h3>
                      <TicketActions
                        ticketId={serializedTicket.id}
                        ticketStatus={serializedTicket.status}
                        checkedIn={serializedTicket.checked_in || false}
                        eventTitle={serializedEvent.title}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Event Details Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Event Info Card */}
            <div className="bg-white rounded-2xl shadow-medium border-2 border-gray-200 overflow-hidden">
              {serializedEvent.banner_image_url && (
                <div className="h-48 bg-gradient-to-br from-brand-600 to-accent-500 relative overflow-hidden">
                  <img
                    src={serializedEvent.banner_image_url}
                    alt={serializedEvent.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              )}

              <div className="p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{serializedEvent.title}</h2>
                  <a 
                    href={`/events/${serializedEvent.id}`}
                    className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                  >
                    View Event Details →
                  </a>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date</p>
                      <p className="font-bold text-gray-900 text-sm">{format(new Date(serializedEvent.start_datetime || serializedEvent.date), 'MMM d, yyyy')}</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(serializedEvent.start_datetime || serializedEvent.date), 'h:mm a')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-accent-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Venue</p>
                      <p className="font-bold text-gray-900 text-sm">{serializedEvent.venue_name || serializedEvent.location}</p>
                      <p className="text-sm text-gray-600">{serializedEvent.commune}, {serializedEvent.city}</p>
                      <div className="flex gap-2 mt-2">
                        <a
                          href={`https://maps.apple.com/?q=${encodeURIComponent(serializedEvent.address || `${serializedEvent.venue_name || serializedEvent.location}, ${serializedEvent.commune}, ${serializedEvent.city}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" />
                          Apple Maps
                        </a>
                        <span className="text-gray-300">|</span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(serializedEvent.address || `${serializedEvent.venue_name || serializedEvent.location}, ${serializedEvent.commune}, ${serializedEvent.city}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" />
                          Google Maps
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Attendee</p>
                      <p className="font-bold text-gray-900 text-sm">{user.full_name || user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Purchased</p>
                      <p className="font-bold text-gray-900 text-sm">{format(new Date(serializedTicket.purchased_at), 'MMM d, yyyy')}</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(serializedTicket.purchased_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-900 mb-1">How to Use</h3>
                  <p className="text-sm text-blue-700">Your entry guide</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                  <span>Show QR code at entrance</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                  <span>Save to wallet for offline access</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                  <span>Each ticket valid for one entry</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                  <span>Digital or printed both work</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Review Form for Past Events */}
        {eventPassed && !isDemoMode() && (
          <div className="mt-6">
            <ReviewForm 
              eventId={event.id} 
              ticketId={ticket.id}
              eventTitle={event.title}
            />
          </div>
        )}
      </div>
    </div>
  )
}
