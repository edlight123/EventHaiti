import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import Badge from './ui/Badge'
import { TrendingUp, Star, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Event {
  id: string
  title: string
  description: string
  category: string
  city: string
  start_datetime: string
  ticket_price: number
  currency: string
  total_tickets: number
  tickets_sold: number
  banner_image_url?: string | null
  tags?: string[] | null
  users?: {
    full_name: string
    is_verified: boolean
  }
}

interface EventCardProps {
  event: Event
  priority?: boolean
  index?: number
}

export default function EventCard({ event, priority = false, index = 0 }: EventCardProps) {
  const { t } = useTranslation('common')
  const remainingTickets = event.total_tickets - event.tickets_sold
  const isSoldOut = remainingTickets <= 0
  const isFree = !event.ticket_price || event.ticket_price === 0
  
  // Premium badge logic
  const isVIP = (event.ticket_price || 0) > 100
  const isTrending = (event.tickets_sold || 0) > 10
  const isNew = new Date(event.start_datetime).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000 // Within 7 days
  const selloutSoon = !isSoldOut && remainingTickets < 10

  return (
    <Link href={`/events/${event.id}`} prefetch={true} className="group">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-soft hover:shadow-hard transition-all duration-300 overflow-hidden border border-gray-100 group-hover:-translate-y-1.5 group-hover:border-brand-200 relative">
        
        {/* Image Container with Gradient Overlay */}
        {event.banner_image_url ? (
          <div className="h-24 sm:h-36 md:h-48 lg:h-52 bg-gray-200 overflow-hidden relative">
            <Image
              src={event.banner_image_url}
              alt={event.title}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-700"
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              quality={75}
              priority={priority || index < 3}
              loading={priority || index < 3 ? 'eager' : 'lazy'}
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VmZjZmZiIvPjwvc3ZnPg=="
            />
            {/* Premium gradient overlay for better text contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Top-left premium badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
              {isVIP && (
                <Badge variant="vip" size="sm" icon={<Star className="w-3 h-3" />}>
                  VIP
                </Badge>
              )}
              {isTrending && (
                <Badge variant="trending" size="sm" icon={<TrendingUp className="w-3 h-3" />}>
                  {t('events.trending')}
                </Badge>
              )}
              {isNew && (
                <Badge variant="new" size="sm" icon={<Sparkles className="w-3 h-3" />}>
                  {t('events.new')}
                </Badge>
              )}
            </div>
            
            {/* Top-right status badges */}
            <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
              {isSoldOut && (
                <Badge variant="error" size="sm">
                  {t('events.soldOut')}
                </Badge>
              )}
              {selloutSoon && !isSoldOut && (
                <Badge variant="warning" size="sm">
                  {t('ticket.remaining', { count: remainingTickets })}
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="h-24 sm:h-36 md:h-48 lg:h-52 bg-gradient-to-br from-brand-100 via-brand-50 to-accent-100 flex items-center justify-center relative group-hover:from-brand-200 group-hover:to-accent-200 transition-all duration-500">
            <span className="text-2xl sm:text-3xl md:text-5xl group-hover:scale-110 transition-transform duration-500">🎉</span>
            
            {/* Badges for placeholder images too */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {isVIP && (
                <Badge variant="vip" size="sm" icon={<Star className="w-3 h-3" />}>
                  VIP
                </Badge>
              )}
              {isTrending && (
                <Badge variant="trending" size="sm" icon={<TrendingUp className="w-3 h-3" />}>
                  Trending
                </Badge>
              )}
              {isNew && (
                <Badge variant="new" size="sm" icon={<Sparkles className="w-3 h-3" />}>
                  New
                </Badge>
              )}
            </div>
            
            <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
              {isSoldOut && (
                <Badge variant="error" size="sm">
                  SOLD OUT
                </Badge>
              )}
              {selloutSoon && !isSoldOut && (
                <Badge variant="warning" size="sm">
                  {remainingTickets} left!
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="p-2 sm:p-3 md:p-4 lg:p-5">
          <div className="flex items-start justify-between mb-1 sm:mb-1.5 md:mb-2 gap-2">
            <span className="px-1.5 py-0.5 text-[7px] sm:text-[9px] bg-gray-100 text-gray-600 rounded font-medium uppercase tracking-wide">
              {event.category}
            </span>
            {event.users?.is_verified && (
              <div className="inline-flex items-center gap-0.5 text-blue-600 bg-blue-50 px-1 py-0.5 rounded" title="Verified Organizer">
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>

          <h3 className="text-base sm:text-base md:text-lg font-extrabold text-gray-900 mb-1.5 sm:mb-2 line-clamp-2 group-hover:text-brand-700 transition-colors duration-300 leading-tight">
            {event.title}
          </h3>

          {/* Tags - hidden on mobile */}
          {event.tags && event.tags.length > 0 && (
            <div className="hidden sm:flex flex-wrap gap-1.5 mb-3 overflow-hidden max-h-7">
              {event.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-[10px] bg-gray-50 text-gray-600 rounded border border-gray-200 font-medium"
                >
                  {tag}
                </span>
              ))}
              {event.tags.length > 3 && (
                <span className="px-2 py-0.5 text-[10px] text-gray-500 font-medium">
                  +{event.tags.length - 3}
                </span>
              )}
            </div>
          )}

          <div className="mb-2 sm:mb-2.5 md:mb-3">
            <div className="flex items-center gap-1 text-[11px] sm:text-sm md:text-base text-gray-700 font-medium">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-accent-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="truncate">{format(new Date(event.start_datetime), 'MMM d, yyyy')}</span>
              <span className="text-gray-300 mx-0.5">•</span>
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-accent-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{event.city}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 sm:pt-2.5 md:pt-3 border-t border-gray-100">
            <div>
              {isFree ? (
                <p className="text-2xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-success-600 to-success-700 bg-clip-text text-transparent">{t('common.free')}</p>
              ) : (
                <p className="text-2xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                  {t('common.from')} {event.ticket_price} <span className="text-sm sm:text-sm font-normal text-gray-600">{event.currency}</span>
                </p>
              )}
            </div>
            {!isSoldOut && (
              <div className="text-right">
                <p className={`text-sm sm:text-sm font-bold ${selloutSoon ? 'text-warning-600' : 'text-brand-700'}`}>
                  {t('ticket.remaining', { count: remainingTickets })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
