import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import Badge from './ui/Badge'
import { Calendar, MapPin, TrendingUp, Star, Sparkles } from 'lucide-react'

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

interface EventCardHorizontalProps {
  event: Event
}

export default function EventCardHorizontal({ event }: EventCardHorizontalProps) {
  const remainingTickets = event.total_tickets - event.tickets_sold
  const isSoldOut = remainingTickets <= 0
  const isFree = !event.ticket_price || event.ticket_price === 0
  
  // Premium badge logic
  const isVIP = (event.ticket_price || 0) > 100
  const isTrending = (event.tickets_sold || 0) > 10
  const isNew = new Date(event.start_datetime).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000
  const selloutSoon = !isSoldOut && remainingTickets < 10

  return (
    <Link href={`/events/${event.id}`} className="group">
      <div className="bg-white rounded-xl shadow-soft hover:shadow-medium transition-all duration-300 overflow-hidden border border-gray-100 group-hover:border-brand-200 flex h-28 sm:h-32">
        
        {/* Image - Left Side */}
        <div className="relative w-24 sm:w-32 flex-shrink-0 bg-gray-200">
          {event.banner_image_url ? (
            <Image
              src={event.banner_image_url}
              alt={event.title}
              fill
              className="object-cover"
              sizes="128px"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center">
              <span className="text-3xl">🎉</span>
            </div>
          )}
          
          {/* Status badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isSoldOut && (
              <Badge variant="error" size="sm">OUT</Badge>
            )}
            {isTrending && !isSoldOut && (
              <Badge variant="trending" size="sm">
                <TrendingUp className="w-3 h-3" />
              </Badge>
            )}
          </div>
        </div>

        {/* Content - Right Side */}
        <div className="flex-1 p-2 sm:p-3 flex flex-col justify-between min-w-0">
          {/* Top Section */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <Badge variant="neutral" size="sm" className="flex-shrink-0">
                {event.category}
              </Badge>
              {event.users?.is_verified && (
                <div className="flex items-center gap-0.5 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-xs flex-shrink-0">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            <h3 className="font-bold text-gray-900 mb-1 line-clamp-1 text-sm sm:text-base group-hover:text-brand-700 transition-colors">
              {event.title}
            </h3>

            <div className="space-y-0.5">
              <div className="flex items-center text-[11px] sm:text-xs text-gray-600 gap-1">
                <Calendar className="w-3 h-3 text-accent-600 flex-shrink-0" />
                <span className="truncate">{format(new Date(event.start_datetime), 'MMM d, h:mm a')}</span>
              </div>
              <div className="flex items-center text-[11px] sm:text-xs text-gray-600 gap-1">
                <MapPin className="w-3 h-3 text-accent-600 flex-shrink-0" />
                <span className="truncate">{event.city}</span>
              </div>
            </div>
          </div>

          {/* Bottom Section - Price */}
          <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-gray-100">
            {isFree ? (
              <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-success-600 to-success-700 bg-clip-text text-transparent">
                FREE
              </span>
            ) : (
              <div className="flex items-baseline">
                <span className="text-base sm:text-lg font-bold text-gray-900">{event.ticket_price}</span>
                <span className="text-[10px] sm:text-xs text-gray-600 ml-1">{event.currency}</span>
              </div>
            )}
            {!isSoldOut && (
              <span className={`text-[10px] sm:text-xs font-semibold ${selloutSoon ? 'text-warning-600' : 'text-gray-500'}`}>
                {remainingTickets} left
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
