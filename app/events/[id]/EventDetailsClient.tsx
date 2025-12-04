'use client'

import BuyTicketButton from './BuyTicketButton'
import FavoriteButton from '@/components/FavoriteButton'
import FollowButton from '@/components/FollowButton'
import EventCard from '@/components/EventCard'
import ShareButton from './ShareButton'
import ShareButtonInline from './ShareButtonInline'
import MobileHero from './MobileHero'
import MobileKeyFacts from './MobileKeyFacts'
import MobileAccordions from './MobileAccordions'
import { Shield, Calendar, MapPin, Clock, Users, TrendingUp, Star, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import Image from 'next/image'
import Badge from '@/components/ui/Badge'
import { useTranslation } from 'react-i18next'

interface EventDetailsClientProps {
  event: any
  user: any
  isFavorite: boolean
  isFollowing: boolean
  relatedEvents: any[]
}

export default function EventDetailsClient({ event, user, isFavorite, isFollowing, relatedEvents }: EventDetailsClientProps) {
  const { t } = useTranslation('events')
  const startDate = new Date(event.start_datetime)
  const endDate = event.end_datetime ? new Date(event.end_datetime) : startDate
  const isSoldOut = (event.capacity && event.tickets_sold >= event.capacity) || false
  const ticketsRemaining = event.capacity ? event.capacity - (event.tickets_sold || 0) : null
  const isFree = event.is_free || !event.price
  
  // Premium badges
  const isVIP = false // Add logic if needed
  const isTrending = false // Add logic if needed
  const selloutSoon = ticketsRemaining && ticketsRemaining < 20 && ticketsRemaining > 0

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav md:pb-8">
      {/* MOBILE HERO */}
      <div className="md:hidden">
        <MobileHero
          title={event.title}
          category={event.category}
          bannerUrl={event.banner_image_url}
          organizerName={event.users?.full_name || 'Event Organizer'}
          isVerified={event.users?.is_verified || false}
          organizerId={event.organizer_id}
          isVIP={isVIP}
          isTrending={isTrending}
          isSoldOut={isSoldOut}
          selloutSoon={!!selloutSoon}
        />
      </div>

      {/* DESKTOP HERO */}
      <div className="hidden md:block relative bg-gray-900 overflow-hidden">
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
                  {t('actions.sold_out')}
                </Badge>
              )}
              {selloutSoon && (
                <Badge variant="warning" size="md">
                  {t('info.selling_fast')}
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2 sm:mb-3 md:mb-4 leading-tight">
              {event.title}
            </h1>

            {/* Organizer */}
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
                    <span>{t('info.verified_organizer')}</span>
                  </div>
                )}
              </div>
            </a>

            {/* Key Info - Desktop Hero Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 md:gap-6">
              {/* Date & Time */}
              <div className="flex items-start gap-2.5 bg-white/10 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/20">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-accent-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] md:text-xs text-gray-300 mb-0.5">{t('details.when')}</p>
                  <p className="text-white font-semibold text-[13px] md:text-sm">
                    {format(startDate, 'MMM d, yyyy')}
                  </p>
                  <p className="text-gray-300 text-[11px] md:text-xs">
                    {format(startDate, 'h:mm a')}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-2.5 bg-white/10 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/20">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] md:text-xs text-gray-300 mb-0.5">{t('details.where')}</p>
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
                  <p className="text-[11px] md:text-xs text-gray-300 mb-0.5">{t('details.tickets_available')}</p>
                  <p className="text-white font-semibold text-[13px] md:text-sm">
                    {isSoldOut ? t('actions.sold_out') : ticketsRemaining ? `${ticketsRemaining} left` : 'Available'}
                  </p>
                  <p className="text-gray-300 text-[11px] md:text-xs">
                    {event.capacity ? `${event.capacity} total` : 'Unlimited'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY CTA */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        {user && <FavoriteButton eventId={event.id} userId={user.id} initialIsFavorite={isFavorite} />}
        <div className="flex-1">
          {user ? (
            <BuyTicketButton 
              eventId={event.id} 
              userId={user.id} 
              isFree={isFree} 
              ticketPrice={event.price || 0}
              eventTitle={event.title}
              currency={event.currency || 'HTG'}
            />
          ) : (
            <a href="/auth/login" className="block w-full bg-brand-600 text-white text-center font-semibold py-3 rounded-xl">
              {t('actions.buy_now')}
            </a>
          )}
        </div>
        <ShareButton eventId={event.id} eventTitle={event.title} />
      </div>

      {/* MOBILE KEY FACTS */}
      <div className="md:hidden">
        <MobileKeyFacts
          startDate={event.start_datetime}
          venueName={event.venue_name}
          city={event.city}
          address={event.address || ''}
          commune={event.commune || ''}
          isFree={isFree}
          ticketPrice={event.price || 0}
          currency={event.currency || 'HTG'}
          remainingTickets={ticketsRemaining || 0}
          isSoldOut={isSoldOut}
        />
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-0 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8" style={{ paddingBottom: 'calc(68px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 px-4 md:px-0">
          
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2 space-y-4">

            {/* MOBILE ACCORDIONS */}
            <div className="md:hidden">
              <MobileAccordions
                description={event.description}
                venueName={event.venue_name}
                address={event.address || ''}
                commune={event.commune || ''}
                city={event.city}
                startDatetime={event.start_datetime}
                endDatetime={event.end_datetime || event.start_datetime}
                organizerName={event.users?.full_name || 'Event Organizer'}
                organizerId={event.organizer_id}
                isVerified={event.users?.is_verified || false}
                shareButton={
                  <ShareButtonInline
                    eventId={event.id}
                    eventTitle={event.title}
                    eventDate={format(startDate, 'MMM d, yyyy')}
                    eventVenue={`${event.venue_name}, ${event.city}`}
                  />
                }
              />
            </div>
            
            {/* DESKTOP SECTIONS */}
            <div className="hidden md:block bg-white rounded-2xl shadow-soft border border-gray-100 p-3 sm:p-4 md:p-6">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" />
                {t('details.description')}
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

            {/* Venue Details - Desktop only */}
            <div className="hidden md:block bg-white rounded-2xl shadow-soft border border-gray-100 p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-600" />
                {t('details.where')}
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

            {/* Date & Time Details - Desktop only */}
            <div className="hidden md:block bg-white rounded-2xl shadow-soft border border-gray-100 p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-600" />
                {t('details.when')}
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">START</p>
                  <p className="text-base font-semibold text-gray-900">
                    {format(startDate, 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {format(startDate, 'h:mm a')} HTT
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">END</p>
                  <p className="text-base font-semibold text-gray-900">
                    {format(endDate, 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {format(endDate, 'h:mm a')} HTT
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Sticky Sidebar (Desktop) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              
              {/* Ticket Purchase Card */}
              <div className="bg-white rounded-2xl shadow-medium border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">{t('actions.buy_now')}</h3>
                  {user && <FavoriteButton eventId={event.id} userId={user.id} initialIsFavorite={isFavorite} />}
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
                        <span className="text-4xl font-bold text-gray-900">{(event.price || 0).toLocaleString()}</span>
                        <span className="text-xl text-gray-600 ml-2">{event.currency || 'HTG'}</span>
                      </div>
                      <p className="text-sm text-gray-500">per ticket</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {user ? (
                    <>
                      <BuyTicketButton 
                        eventId={event.id} 
                        userId={user.id} 
                        isFree={isFree}
                        ticketPrice={event.price || 0}
                        eventTitle={event.title}
                        currency={event.currency || 'HTG'}
                      />
                      {user.id !== event.organizer_id && (
                        <FollowButton 
                          organizerId={event.organizer_id} 
                          userId={user.id} 
                          initialIsFollowing={isFollowing} 
                        />
                      )}
                    </>
                  ) : (
                    <a href="/auth/login" className="block w-full bg-brand-600 text-white text-center font-semibold py-4 rounded-xl hover:bg-brand-700 transition">
                      {t('actions.buy_now')}
                    </a>
                  )}
                  <ShareButton eventId={event.id} eventTitle={event.title} />
                </div>

                {/* Ticket Availability Info */}
                {ticketsRemaining && ticketsRemaining <= 20 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-orange-600 font-medium">
                      ⚡ {t('info.last_tickets')}
                    </p>
                  </div>
                )}
              </div>

              {/* Organizer Card */}
              <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-4">{t('details.organizer')}</h3>
                <a href={`/profile/organizer/${event.organizer_id}`} className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-accent-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {(event.users?.full_name || 'E')[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{event.users?.full_name || 'Event Organizer'}</p>
                    {event.users?.is_verified && (
                      <div className="flex items-center gap-1 text-blue-600 text-sm">
                        <Shield className="w-3.5 h-3.5" />
                        <span>{t('info.verified_organizer')}</span>
                      </div>
                    )}
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Related Events */}
        {relatedEvents?.length > 0 && (
          <div className="mt-16 px-4 md:px-0">
            <h2 className="text-2xl font-bold mb-6">Similar Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedEvents.map((e: any) => <EventCard key={e.id} event={e} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
