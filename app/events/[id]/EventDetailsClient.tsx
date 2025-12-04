'use client'

import BuyTicketButton from './BuyTicketButton'
import FavoriteButton from '@/components/FavoriteButton'
import FollowButton from '@/components/FollowButton'
import EventCard from '@/components/EventCard'
import ShareButton from './ShareButton'
import MobileHero from './MobileHero'
import MobileKeyFacts from './MobileKeyFacts'
import MobileAccordions from './MobileAccordions'
import { Shield, Calendar, MapPin, Clock, Users } from 'lucide-react'
import { format } from 'date-fns'
import Image from 'next/image'
import Badge from '@/components/ui/Badge'

interface EventDetailsClientProps {
  event: any
  user: any
  isFavorite: boolean
  isFollowing: boolean
  relatedEvents: any[]
}

export default function EventDetailsClient({ event, user, isFavorite, isFollowing, relatedEvents }: EventDetailsClientProps) {
  const startDate = new Date(event.start_datetime)
  const isSoldOut = (event.capacity && event.tickets_sold >= event.capacity) || false
  const ticketsRemaining = event.capacity ? event.capacity - (event.tickets_sold || 0) : null

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav md:pb-8">
      <MobileHero
        title={event.title}
        category={event.category}
        bannerUrl={event.banner_image_url}
        organizerName={event.users?.full_name || 'Event Organizer'}
        isVerified={event.users?.is_verified || false}
        organizerId={event.organizer_id}
        isVIP={false}
        isTrending={false}
        isSoldOut={isSoldOut}
        selloutSoon={false}
      />

      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        {user && <FavoriteButton eventId={event.id} userId={user.id} initialIsFavorite={isFavorite} />}
        <div className="flex-1">
          {user ? (
            <BuyTicketButton 
              eventId={event.id} 
              userId={user.id} 
              isFree={event.is_free || !event.price} 
              ticketPrice={event.price || 0}
              eventTitle={event.title}
              currency={event.currency || 'HTG'}
            />
          ) : (
            <a href="/auth/login" className="block w-full bg-brand-600 text-white text-center font-semibold py-3 rounded-xl">
              Sign in to Get Tickets
            </a>
          )}
        </div>
        <ShareButton eventId={event.id} eventTitle={event.title} />
      </div>

      <MobileKeyFacts
        startDate={event.start_datetime}
        venueName={event.venue_name}
        city={event.city}
        address={event.address || ''}
        commune={event.commune || ''}
        isFree={event.is_free || !event.price}
        ticketPrice={event.price || 0}
        currency={event.currency || 'HTG'}
        remainingTickets={ticketsRemaining || 0}
        isSoldOut={isSoldOut}
      />

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
        shareButton={<ShareButton eventId={event.id} eventTitle={event.title} />}
      />

      <div className="hidden md:block max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {event.banner_image_url && (
              <div className="relative w-full rounded-2xl overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
                <Image src={event.banner_image_url} alt={event.title} fill className="object-cover" />
              </div>
            )}
            <div className="mb-6">
              <Badge variant="warning">{event.category}</Badge>
              <h1 className="text-4xl font-bold mt-2">{event.title}</h1>
              <p className="text-gray-600 mt-2">
                By <a href={`/profile/organizer/${event.organizer_id}`} className="text-brand-600">{event.users?.full_name || 'Organizer'}</a>
              </p>
            </div>
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{event.description}</p>
            </div>
          </div>
          <div>
            <div className="sticky top-8 bg-white rounded-2xl shadow-lg p-6">
              <div className="mb-4">
                {event.is_free ? (
                  <p className="text-3xl font-bold text-brand-600">FREE</p>
                ) : (
                  <p className="text-3xl font-bold">{event.currency || 'HTG'} {(event.price || 0).toLocaleString()}</p>
                )}
              </div>
              {user ? (
                <>
                  <BuyTicketButton 
                    eventId={event.id} 
                    userId={user.id} 
                    isFree={event.is_free || !event.price}
                    ticketPrice={event.price || 0}
                    eventTitle={event.title}
                    currency={event.currency || 'HTG'}
                  />
                  {user.id !== event.organizer_id && (
                    <div className="mt-3">
                      <FollowButton organizerId={event.organizer_id} userId={user.id} initialIsFollowing={isFollowing} />
                    </div>
                  )}
                </>
              ) : (
                <a href="/auth/login" className="block w-full bg-brand-600 text-white text-center font-semibold py-4 rounded-xl">
                  Sign in
                </a>
              )}
            </div>
          </div>
        </div>

        {relatedEvents?.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Similar Events</h2>
            <div className="grid grid-cols-3 gap-6">
              {relatedEvents.map((e: any) => <EventCard key={e.id} event={e} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
