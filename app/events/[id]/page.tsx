import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import BuyTicketButton from './BuyTicketButton'
import ShareButtons from './ShareButtons'
import FavoriteButton from '@/components/FavoriteButton'
import FollowButton from '@/components/FollowButton'
import WaitlistButton from '@/components/WaitlistButton'
import ReviewsList from '@/components/ReviewsList'
import EventCard from '@/components/EventCard'
import Badge from '@/components/ui/Badge'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'
import { Calendar, MapPin, Clock, Users, Shield, TrendingUp, Star, Sparkles } from 'lucide-react'
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
  
  // Premium badge logic
  const isVIP = (event.ticket_price || 0) > 100
  const isTrending = (event.tickets_sold || 0) > 10
  const selloutSoon = !isSoldOut && remainingTickets < 10

  // Fetch reviews for this event
  let reviews: any[] = []
  if (!isDemoMode()) {
    const supabase = await createClient()
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*, users!reviews_user_id_fkey(full_name)')
      .eq('event_id', id)
    
    reviews = reviewsData?.map((r: any) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      user: {
        full_name: r.users?.full_name || 'Anonymous'
      }
    })) || []
  }
  
  // Fetch related events (same category, exclude current event)
  let relatedEvents: any[] = []
  if (!isDemoMode()) {
    const supabase = await createClient()
    const now = new Date().toISOString()
    const { data: relatedData } = await supabase
      .from('events')
      .select('*, users!events_organizer_id_fkey(full_name, is_verified)')
      .eq('category', event.category)
      .eq('is_published', true)
      .gte('start_datetime', now)
      .neq('id', id)
      .limit(3)
    
    relatedEvents = relatedData || []
  } else {
    // Use demo events for related section
    relatedEvents = DEMO_EVENTS.filter(e => e.category === event.category && e.id !== id).slice(0, 3)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      {/* PREMIUM HERO SECTION */}
      <div className="relative bg-gray-900">
        {/* Background Image with Overlay */}
        {event.banner_image_url ? (
          <div className="absolute inset-0">
            <img
              src={event.banner_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-brand-700 to-accent-600" />
        )}

        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="max-w-4xl">
            {/* Premium Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <Badge variant="neutral" size="md">
                {event.category}
              </Badge>
              {isVIP && (
                <Badge variant="vip" size="md" icon={<Star className="w-4 h-4" />}>
                  VIP Event
                </Badge>
              )}
              {isTrending && (
                <Badge variant="trending" size="md" icon={<TrendingUp className="w-4 h-4" />}>
                  Trending
                </Badge>
              )}
              {isSoldOut && (
                <Badge variant="error" size="md">
                  SOLD OUT
                </Badge>
              )}
              {selloutSoon && (
                <Badge variant="warning" size="md">
                  Almost Sold Out
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              {event.title}
            </h1>

            {/* Organizer */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-accent-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {(event.users?.full_name || 'E')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold">
                  {event.users?.full_name || 'Event Organizer'}
                </p>
                {event.users?.is_verified && (
                  <div className="flex items-center gap-1 text-blue-300 text-sm">
                    <Shield className="w-4 h-4" />
                    <span>Verified Organizer</span>
                  </div>
                )}
              </div>
            </div>

            {/* Key Info - Horizontal on Desktop */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* Date & Time */}
              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className="w-10 h-10 bg-accent-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-300 mb-1">Date & Time</p>
                  <p className="text-white font-semibold text-sm">
                    {format(new Date(event.start_datetime), 'MMM d, yyyy')}
                  </p>
                  <p className="text-gray-300 text-xs">
                    {format(new Date(event.start_datetime), 'h:mm a')}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className="w-10 h-10 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-300 mb-1">Location</p>
                  <p className="text-white font-semibold text-sm line-clamp-1">
                    {event.venue_name}
                  </p>
                  <p className="text-gray-300 text-xs line-clamp-1">
                    {event.city}
                  </p>
                </div>
              </div>

              {/* Tickets */}
              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-300 mb-1">Availability</p>
                  <p className="text-white font-semibold text-sm">
                    {isSoldOut ? 'Sold Out' : `${remainingTickets} tickets left`}
                  </p>
                  <p className="text-gray-300 text-xs">
                    {event.total_tickets} total
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 md:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* About Section */}
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 md:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-brand-600" />
                About This Event
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-lg">
                {event.description}
              </p>
              
              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">EVENT TAGS</h3>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag: string) => (
                      <Badge key={tag} variant="neutral" size="md">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Venue Details */}
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 md:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-brand-600" />
                Venue Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">VENUE NAME</p>
                  <p className="text-lg font-semibold text-gray-900">{event.venue_name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">ADDRESS</p>
                  <p className="text-gray-700">{event.address}</p>
                  <p className="text-gray-700">{event.commune}, {event.city}</p>
                </div>
              </div>
            </div>

            {/* Date & Time Details */}
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 md:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6 text-brand-600" />
                Date & Time
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">START</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {format(new Date(event.start_datetime), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-gray-600">
                    {format(new Date(event.start_datetime), 'h:mm a')} HTT
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">END</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {format(new Date(event.end_datetime), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-gray-600">
                    {format(new Date(event.end_datetime), 'h:mm a')} HTT
                  </p>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            {reviews.length > 0 && (
              <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 md:p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Reviews</h2>
                <ReviewsList reviews={reviews} />
              </div>
            )}
          </div>

          {/* Right Column - Sticky Sidebar (Desktop) */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              
              {/* Ticket Purchase Card */}
              <div className="bg-white rounded-2xl shadow-medium border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">Get Tickets</h3>
                    <FavoriteButton eventId={event.id} userId={user?.id || null} />
                  </div>
                </div>

                <div className="mb-6">
                  {isFree ? (
                    <div className="bg-success-50 border-2 border-success-200 rounded-xl p-4">
                      <span className="text-3xl font-bold bg-gradient-to-r from-success-600 to-success-700 bg-clip-text text-transparent">
                        FREE EVENT
                      </span>
                      <p className="text-sm text-success-700 mt-1 font-medium">No payment required</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline mb-1">
                        <span className="text-4xl font-bold text-gray-900">{event.ticket_price}</span>
                        <span className="text-xl text-gray-600 ml-2">{event.currency}</span>
                      </div>
                      <p className="text-sm text-gray-600">per ticket</p>
                    </div>
                  )}
                </div>

                {/* Ticket Availability */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Total Tickets</span>
                    <span className="font-bold text-gray-900">{event.total_tickets || 0}</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-600">Available</span>
                    <span className={`font-bold ${selloutSoon ? 'text-warning-600' : 'text-brand-700'}`}>
                      {Math.max(0, remainingTickets)}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full transition-all ${
                          selloutSoon ? 'bg-warning-500' : 'bg-brand-600'
                        }`}
                        style={{ width: `${(event.total_tickets || 0) > 0 ? (((event.total_tickets || 0) - remainingTickets) / (event.total_tickets || 0)) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 font-medium">
                      {(event.total_tickets || 0) > 0 ? Math.round((((event.total_tickets || 0) - remainingTickets) / (event.total_tickets || 0)) * 100) : 0}% sold
                    </p>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="space-y-3">
                  {isSoldOut ? (
                    <WaitlistButton eventId={event.id} userId={user?.id || null} />
                  ) : user ? (
                    <BuyTicketButton eventId={event.id} userId={user.id} isFree={isFree} ticketPrice={event.ticket_price || 0} />
                  ) : (
                    <a
                      href="/auth/login"
                      className="block w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white text-center font-bold py-4 px-6 rounded-xl transition-all shadow-glow hover:shadow-hard"
                    >
                      Sign in to Buy Tickets
                    </a>
                  )}

                  <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3" />
                    Secure payment • Instant confirmation
                  </p>
                </div>
              </div>

              {/* Organizer Card */}
              <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Hosted By</h3>
                <a href={`/profile/organizer/${event.organizer_id}`} className="flex items-start gap-3 mb-4 hover:opacity-80 transition-opacity">
                  <div className="w-14 h-14 bg-gradient-to-br from-brand-400 to-accent-400 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {(event.users?.full_name || 'E')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-lg truncate">
                      {event.users?.full_name || 'Event Organizer'}
                    </p>
                    {event.users?.is_verified && (
                      <div className="flex items-center gap-1 text-blue-600 text-sm mt-1">
                        <Shield className="w-4 h-4" />
                        <span className="font-medium">Verified Organizer</span>
                      </div>
                    )}
                  </div>
                </a>
                {user && event.organizer_id && user.id !== event.organizer_id && (
                  <FollowButton organizerId={event.organizer_id} userId={user.id} />
                )}
              </div>

              {/* Share Card */}
              <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Share Event</h3>
                <ShareButtons eventId={event.id} eventTitle={event.title} />
              </div>
            </div>
          </div>
        </div>

        {/* Related Events Section */}
        {relatedEvents.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Similar Events</h2>
                <p className="text-gray-600 mt-1">You might also be interested in these events</p>
              </div>
              <a 
                href={`/discover?category=${event.category}`}
                className="text-brand-600 hover:text-brand-700 font-semibold"
              >
                View All →
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedEvents.map((relatedEvent) => (
                <EventCard key={relatedEvent.id} event={relatedEvent} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* STICKY MOBILE CTA - Bottom Bar (Hidden on Desktop) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 p-4 shadow-hard z-40">
        <div className="flex items-center justify-between gap-4">
          <div>
            {isFree ? (
              <p className="text-xl font-bold bg-gradient-to-r from-success-600 to-success-700 bg-clip-text text-transparent">
                FREE
              </p>
            ) : (
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900">{event.ticket_price}</span>
                <span className="text-sm text-gray-600 ml-1">{event.currency}</span>
              </div>
            )}
            <p className="text-xs text-gray-600">
              {isSoldOut ? 'Sold Out' : `${remainingTickets} tickets left`}
            </p>
          </div>
          <div className="flex-1">
            {isSoldOut ? (
              <WaitlistButton eventId={event.id} userId={user?.id || null} />
            ) : user ? (
              <BuyTicketButton eventId={event.id} userId={user.id} isFree={isFree} ticketPrice={event.ticket_price || 0} />
            ) : (
              <a
                href="/auth/login"
                className="block w-full bg-gradient-to-r from-brand-500 to-brand-600 text-white text-center font-bold py-3 px-6 rounded-xl transition-all shadow-medium"
              >
                Sign in to Buy
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
