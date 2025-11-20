import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import BuyTicketButton from './BuyTicketButton'
import ShareButtons from './ShareButtons'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'
import type { Metadata } from 'next'

export const revalidate = 0

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  
  let event: any = null
  
  if (isDemoMode()) {
    event = DEMO_EVENTS.find(e => e.id === id)
  } else {
    const supabase = await createClient()
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()
    event = data
  }

  if (!event) {
    return {
      title: 'Event Not Found',
    }
  }

  const eventDate = new Date(event.start_datetime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return {
    title: `${event.title} | EventHaiti`,
    description: event.description || `Join us for ${event.title} at ${event.venue_name}, ${event.city}`,
    openGraph: {
      title: event.title,
      description: event.description || `Join us for ${event.title}`,
      images: event.banner_image_url ? [event.banner_image_url] : [],
      type: 'website',
      siteName: 'EventHaiti',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description: event.description || `Join us for ${event.title}`,
      images: event.banner_image_url ? [event.banner_image_url] : [],
    },
  }
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  const { id } = await params
  
  let event: any = null
  
  if (isDemoMode()) {
    // Find demo event by ID
    event = DEMO_EVENTS.find(e => e.id === id)
    
    if (!event) {
      notFound()
    }
    
    // Add mock organizer info for demo events
    event = {
      ...event,
      users: {
        full_name: 'Demo Organizer'
      }
    }
  } else {
    // Fetch from database
    const supabase = await createClient()
    const { data } = await supabase
      .from('events')
      .select('*, users!events_organizer_id_fkey(full_name)')
      .eq('id', id)
      .single()

    event = data

    if (!event || (!event.is_published && event.organizer_id !== user?.id)) {
      notFound()
    }
  }

  const remainingTickets = (event.total_tickets || 0) - (event.tickets_sold || 0)
  const isSoldOut = remainingTickets <= 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2">
            {/* Banner Image */}
            {event.banner_image_url ? (
              <div className="w-full h-96 rounded-2xl overflow-hidden mb-6 shadow-lg">
                <img
                  src={event.banner_image_url}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-96 rounded-2xl bg-gradient-to-br from-teal-100 to-orange-100 flex items-center justify-center mb-6 shadow-lg">
                <span className="text-9xl">🎉</span>
              </div>
            )}

            {/* Event Info Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
              <div className="mb-6">
                <span className="inline-block px-4 py-1.5 text-sm font-semibold bg-teal-100 text-teal-800 rounded-full mb-4">
                  {event.category}
                </span>
                <h1 className="text-4xl font-bold text-gray-900 mb-3">
                  {event.title}
                </h1>
                <p className="text-lg text-gray-600">
                  By {event.users?.full_name || 'Event Organizer'}
                </p>
              </div>

              {/* Date & Time */}
              <div className="flex items-start mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-lg mb-1">
                    {format(new Date(event.start_datetime), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-gray-600">
                    {format(new Date(event.start_datetime), 'h:mm a')} - {format(new Date(event.end_datetime), 'h:mm a')} HTT
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-lg mb-1">{event.venue_name}</p>
                  <p className="text-gray-600">{event.address}</p>
                  <p className="text-gray-600">{event.commune}, {event.city}</p>
                </div>
              </div>

              {/* Description */}
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About this event</h2>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{event.description}</p>
              </div>
            </div>
          </div>

          {/* Sidebar - Right Side - Sticky */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {/* Ticket Purchase Card */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
                <div className="mb-6">
                  <div className="flex items-baseline mb-2">
                    <span className="text-4xl font-bold text-gray-900">{event.ticket_price || 0}</span>
                    <span className="text-xl text-gray-600 ml-2">{event.currency}</span>
                  </div>
                  <p className="text-sm text-gray-600">per ticket</p>
                </div>

                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Total tickets</span>
                    <span className="font-semibold text-gray-900">{event.total_tickets || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Available</span>
                    <span className="font-semibold text-teal-700">{remainingTickets}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-teal-600 h-2 rounded-full transition-all" 
                        style={{ width: `${(event.total_tickets || 0) > 0 ? (((event.total_tickets || 0) - remainingTickets) / (event.total_tickets || 0)) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {(event.total_tickets || 0) > 0 ? Math.round((((event.total_tickets || 0) - remainingTickets) / (event.total_tickets || 0)) * 100) : 0}% sold
                    </p>
                  </div>
                </div>

                {isSoldOut ? (
                  <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-lg text-center font-bold">
                    SOLD OUT
                  </div>
                ) : user ? (
                  <BuyTicketButton eventId={event.id} userId={user.id} />
                ) : (
                  <a
                    href="/auth/login"
                    className="block w-full bg-orange-600 hover:bg-orange-700 text-white text-center font-bold py-4 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl"
                  >
                    Sign in to buy ticket
                  </a>
                )}

                <p className="text-xs text-gray-500 text-center mt-4">
                  🔒 Secure payment • Instant confirmation
                </p>
              </div>

              {/* Organizer Info Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-3">Organized by</h3>
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-orange-400 rounded-full flex items-center justify-center text-white font-bold text-lg mr-3">
                    {(event.users?.full_name || 'E')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{event.users?.full_name || 'Event Organizer'}</p>
                    <p className="text-sm text-gray-600">Event Organizer</p>
                  </div>
                </div>
              </div>

              {/* Share Section */}
              <ShareButtons eventId={event.id} eventTitle={event.title} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
