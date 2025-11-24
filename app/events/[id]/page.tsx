import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import BuyTicketButton from './BuyTicketButton'
import ShareButtons from './ShareButtons'
import FavoriteButton from '@/components/FavoriteButton'
import FollowButton from '@/components/FollowButton'
import EventShare from './EventShare'
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
      .select('*, users!events_organizer_id_fkey(full_name, is_verified)')
      .eq('id', id)
      .single()

    event = data

    if (!event || (!event.is_published && event.organizer_id !== user?.id)) {
      notFound()
    }
  }

  const remainingTickets = (event.total_tickets || 0) - (event.tickets_sold || 0)
  const isSoldOut = remainingTickets <= 0 && (event.total_tickets || 0) > 0
  const isFree = !event.ticket_price || event.ticket_price === 0

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
                <div className="flex items-start justify-between mb-4">
                  <span className="inline-block px-4 py-1.5 text-sm font-semibold bg-teal-100 text-teal-800 rounded-full">
                    {event.category}
                  </span>
                  <FavoriteButton eventId={event.id} userId={user?.id || null} />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-3">
                  {event.title}
                </h1>
                <div className="flex items-center gap-2 text-lg text-gray-600">
                  <span>By {event.users?.full_name || 'Event Organizer'}</span>
                  {event.users?.is_verified && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs font-semibold">Verified</span>
                    </div>
                  )}
                </div>
                
                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {event.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
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
                  {isFree ? (
                    <div>
                      <span className="text-4xl font-bold text-green-600">FREE</span>
                      <p className="text-sm text-gray-600 mt-1">No payment required</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline mb-2">
                        <span className="text-4xl font-bold text-gray-900">{event.ticket_price}</span>
                        <span className="text-xl text-gray-600 ml-2">{event.currency}</span>
                      </div>
                      <p className="text-sm text-gray-600">per ticket</p>
                    </div>
                  )}
                </div>

                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Total tickets</span>
                    <span className="font-semibold text-gray-900">{event.total_tickets || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Available</span>
                    <span className="font-semibold text-teal-700">{Math.max(0, remainingTickets)}</span>
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
                  <BuyTicketButton eventId={event.id} userId={user.id} isFree={isFree} ticketPrice={event.ticket_price || 0} />
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-3">Organized by</h3>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-orange-400 rounded-full flex items-center justify-center text-white font-bold text-lg mr-3">
                      {(event.users?.full_name || 'E')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{event.users?.full_name || 'Event Organizer'}</p>
                      <p className="text-sm text-gray-600">Event Organizer</p>
                    </div>
                  </div>
                  {user && event.organizer_id && user.id !== event.organizer_id && (
                    <FollowButton organizerId={event.organizer_id} userId={user.id} />
                  )}
                </div>
              </div>

              {/* Share Section */}
              <EventShare eventId={event.id} eventTitle={event.title} />
              <ShareButtons eventId={event.id} eventTitle={event.title} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
