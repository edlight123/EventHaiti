import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import Navbar from '@/components/Navbar'
import { notFound } from 'next/navigation'
import BuyTicketButton from './BuyTicketButton'
import FavoriteButton from '@/components/FavoriteButton'
import FollowButton from '@/components/FollowButton'
import WaitlistButton from '@/components/WaitlistButton'
import ReviewsList from '@/components/ReviewsList'
import EventCard from '@/components/EventCard'
import EventCardHorizontal from '@/components/EventCardHorizontal'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'
import { Shield, Calendar, MapPin, Clock, Users, TrendingUp, Star, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import Image from 'next/image'
import Badge from '@/components/ui/Badge'
import type { Metadata } from 'next'
import PullToRefresh from '@/components/PullToRefresh'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { revalidatePath } from 'next/cache'
import ShareButton from './ShareButton'

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
  
  // Server action for pull-to-refresh
  async function refreshPage() {
    'use server'
    revalidatePath(`/events/${id}`)
  }
  
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
        full_name: 'Demo Organizer',
        is_verified: true
      }
    }
  } else {
    // Fetch from database
    const supabase = await createClient()
    
    // First get the event
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    console.log('Event query result:', { eventData, eventError, id })

    if (!eventData) {
      console.log('Event not found, returning 404')
      notFound()
    }

    if (!eventData.is_published && eventData.organizer_id !== user?.id) {
      console.log('Event not published and user is not organizer, returning 404')
      notFound()
    }

    // Then get the organizer data separately
    const { data: organizerData, error: organizerError } = await supabase
      .from('users')
      .select('full_name, is_verified')
      .eq('id', eventData.organizer_id)
      .single()

    console.log('Organizer query result:', { organizerData, organizerError, organizerId: eventData.organizer_id })

    // Handle case where organizer data might not exist
    event = {
      ...eventData,
      users: organizerData || {
        full_name: 'Event Organizer',
        is_verified: false
      }
    }
    
    // Fetch ticket tiers to calculate accurate total capacity
    const { data: tiersData } = await supabase
      .from('ticket_tiers')
      .select('quantity')
      .eq('event_id', id)
    
    const totalFromTiers = tiersData?.reduce((sum: number, tier: any) => sum + (tier.quantity || 0), 0) || 0
    event.total_tickets = totalFromTiers || event.total_tickets || 0
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

  // Check if user is following this organizer
  let isFollowing = false
  if (!isDemoMode() && user && event.organizer_id) {
    const supabase = await createClient()
    const { data: followData } = await supabase
      .from('organizer_follows')
      .select('id')
      .eq('organizer_id', event.organizer_id)
      .eq('user_id', user.id)
      .single()
    
    isFollowing = !!followData
  }

  // Check if user has favorited this event
  let isFavorite = false
  if (!isDemoMode() && user) {
    const supabase = await createClient()
    const { data: favoriteData } = await supabase
      .from('event_favorites')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .single()
    
    isFavorite = !!favoriteData
  }

  return (
    <PullToRefresh onRefresh={refreshPage}>
      <div className="min-h-screen bg-gray-50 pb-mobile-nav">
        <Navbar user={user} isAdmin={isAdmin(user?.email)} />

      {/* PREMIUM HERO SECTION - Compact on Mobile */}
      <div className="relative bg-gray-900 max-h-[40vh] md:max-h-none overflow-hidden">
        {/* Background Image with Overlay */}
        {event.banner_image_url ? (
          <div className="absolute inset-0">
            <Image
              src={event.banner_image_url}
              alt={event.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-brand-700 to-accent-600" />
        )}

        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-20">
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

            {/* Title - Refined sizing */}
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2 sm:mb-3 md:mb-4 leading-tight">
              {event.title}
            </h1>

            {/* Organizer - Compact on mobile */}
            <a href={`/profile/organizer/${event.organizer_id}`} className="flex items-center gap-2 md:gap-3 mb-3 sm:mb-4 md:mb-8 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-brand-400 to-accent-400 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base md:text-lg">
                {(event.users?.full_name || 'E')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold text-xs sm:text-sm md:text-base">
                  {event.users?.full_name || 'Event Organizer'}
                </p>
                {event.users?.is_verified && (
                  <div className="flex items-center gap-1 text-blue-300 text-xs md:text-sm">
                    <Shield className="w-3 h-3 md:w-4 md:h-4" />
                    <span>Verified</span>
                  </div>
                )}
              </div>
            </a>

            {/* Key Info - Compact & refined */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 md:gap-6">
              {/* Date & Time */}
              <div className="flex items-start gap-2.5 bg-white/10 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/20">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-accent-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] md:text-xs text-gray-300 mb-0.5">Date & Time</p>
                  <p className="text-white font-semibold text-[13px] md:text-sm">
                    {format(new Date(event.start_datetime), 'MMM d, yyyy')}
                  </p>
                  <p className="text-gray-300 text-[11px] md:text-xs">
                    {format(new Date(event.start_datetime), 'h:mm a')}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-2.5 bg-white/10 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/20">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] md:text-xs text-gray-300 mb-0.5">Location</p>
                  <p className="text-white font-semibold text-[13px] md:text-sm line-clamp-1">
                    {event.venue_name}
                  </p>
                  <p className="text-gray-300 text-[11px] md:text-xs line-clamp-1">
                    {event.city}
                  </p>
                </div>
              </div>

              {/* Tickets */}
              <div className="flex items-start gap-2.5 bg-white/10 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/20">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] md:text-xs text-gray-300 mb-0.5">Availability</p>
                  <p className="text-white font-semibold text-[13px] md:text-sm">
                    {isSoldOut ? 'Sold Out' : `${remainingTickets} left`}
                  </p>
                  <p className="text-gray-300 text-[11px] md:text-xs">
                    {event.total_tickets} total
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8 pb-32 md:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            
            {/* About Section - Refined typography */}
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-3 sm:p-4 md:p-6">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" />
                About This Event
              </h2>
              <p className="text-sm sm:text-[15px] text-gray-700 whitespace-pre-wrap leading-relaxed">
                {event.description}
              </p>
              
              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 mb-2">EVENT TAGS</h3>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag: string) => (
                      <Badge key={tag} variant="neutral" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Venue Details - Refined */}
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-600" />
                Venue Information
              </h2>
              <div className="space-y-2.5">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">VENUE NAME</p>
                  <p className="text-base font-semibold text-gray-900">{event.venue_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">ADDRESS</p>
                  <div className="space-y-1.5">
                    <div>
                      <p className="text-[15px] text-gray-700">{event.address}</p>
                      <p className="text-[15px] text-gray-700">{event.commune}, {event.city}</p>
                    </div>
                    <div className="flex gap-3 pt-0.5">
                      <a
                        href={`https://maps.apple.com/?q=${encodeURIComponent(event.address || `${event.venue_name}, ${event.commune}, ${event.city}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Apple Maps
                      </a>
                      <span className="text-gray-300">|</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address || `${event.venue_name}, ${event.commune}, ${event.city}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                      >
                        <MapPin className="w-4 h-4" />
                        Google Maps
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Date & Time Details - Refined */}
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-600" />
                Date & Time
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">START</p>
                  <p className="text-base font-semibold text-gray-900">
                    {format(new Date(event.start_datetime), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(event.start_datetime), 'h:mm a')} HTT
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">END</p>
                  <p className="text-base font-semibold text-gray-900">
                    {format(new Date(event.end_datetime), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(event.end_datetime), 'h:mm a')} HTT
                  </p>
                </div>
              </div>
            </div>

            {/* Reviews Section - Refined */}
            {reviews.length > 0 && (
              <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Reviews</h2>
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
                    <FavoriteButton eventId={event.id} userId={user?.id || null} initialIsFavorite={isFavorite} />
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

                {/* Ticket Availability - Only show detailed stats to organizer */}
                {user?.id === event.organizer_id ? (
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
                ) : (
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Availability</span>
                      <span className={`font-bold ${selloutSoon ? 'text-warning-600' : 'text-brand-700'}`}>
                        {isSoldOut ? 'Sold Out' : selloutSoon ? 'Almost Sold Out' : `${Math.max(0, remainingTickets)} Available`}
                      </span>
                    </div>
                  </div>
                )}

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
                  <FollowButton organizerId={event.organizer_id} userId={user.id} initialIsFollowing={isFollowing} />
                )}
              </div>

              {/* Share Card */}
              <ShareButton 
                eventId={event.id} 
                eventTitle={event.title}
                eventDate={format(new Date(event.start_datetime), 'MMM d, yyyy')}
                eventVenue={`${event.venue_name}, ${event.city}`}
              />
            </div>
          </div>
        </div>

        {/* Related Events Section - Horizontal on mobile */}
        {relatedEvents.length > 0 && (
          <div className="mt-12 md:mt-16">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Similar Events</h2>
                <p className="text-sm text-gray-600 mt-0.5">You might also be interested in</p>
              </div>
              <a 
                href={`/discover?category=${event.category}`}
                className="text-sm text-brand-600 hover:text-brand-700 font-semibold"
              >
                View All →
              </a>
            </div>
            
            {/* Mobile: Horizontal cards */}
            <div className="md:hidden space-y-4">
              {relatedEvents.map((relatedEvent) => (
                <EventCardHorizontal key={relatedEvent.id} event={relatedEvent} />
              ))}
            </div>
            
            {/* Desktop: Grid cards */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedEvents.map((relatedEvent) => (
                <EventCard key={relatedEvent.id} event={relatedEvent} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* STICKY MOBILE CTA - Refined & compact */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 shadow-hard z-40 safe-area-inset-bottom">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-shrink-0">
            {isFree ? (
              <p className="text-lg font-bold bg-gradient-to-r from-success-600 to-success-700 bg-clip-text text-transparent">
                FREE
              </p>
            ) : (
              <div className="flex items-baseline">
                <span className="text-xl font-bold text-gray-900">{event.ticket_price}</span>
                <span className="text-xs text-gray-600 ml-1">{event.currency}</span>
              </div>
            )}
            <p className="text-[11px] text-gray-600">
              {isSoldOut ? 'Sold Out' : `${remainingTickets} left`}
            </p>
          </div>
          <div className="flex-1 min-w-0">
            {isSoldOut ? (
              <WaitlistButton eventId={event.id} userId={user?.id || null} />
            ) : user ? (
              <BuyTicketButton eventId={event.id} userId={user.id} isFree={isFree} ticketPrice={event.ticket_price || 0} />
            ) : (
              <a
                href="/auth/login"
                className="block w-full bg-gradient-to-r from-brand-500 to-brand-600 text-white text-center font-semibold py-3 px-5 rounded-xl transition-all shadow-medium text-[15px]"
              >
                Sign in to Buy
              </a>
            )}
          </div>
        </div>
      </div>
      
      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
    </PullToRefresh>
  )
}
