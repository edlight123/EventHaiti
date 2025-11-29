import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import Badge from './ui/Badge'
import { TrendingUp } from 'lucide-react'

interface Event {
  id: string
  title: string
  description: string
  category: string
  city: string
  venue_name: string
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
      <div className="bg-white rounded-xl shadow-soft hover:shadow-medium transition-all duration-300 overflow-hidden border border-gray-100 group-hover:border-brand-200">
        
        {/* Image - 2/3 ratio */}
        <div className="relative w-full aspect-[3/2] bg-gray-200">
          {event.banner_image_url ? (
            <Image
              src={event.banner_image_url}
              alt={event.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center">
              <span className="text-4xl">🎉</span>
            </div>
          )}
          
          {/* Status badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isSoldOut && (
              <Badge variant="error" size="sm">SOLD OUT</Badge>
            )}
            {isTrending && !isSoldOut && (
              <Badge variant="trending" size="sm">
                <TrendingUp className="w-3 h-3" />
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Category */}
          <span className="px-1.5 py-0.5 text-[7px] sm:text-[9px] bg-gray-100 text-gray-600 rounded font-medium uppercase tracking-wide inline-block mb-1.5">
            {event.category}
          </span>

          {/* Title */}
          <h3 className="font-extrabold text-gray-900 mb-1.5 text-sm sm:text-base group-hover:text-brand-700 transition-colors line-clamp-1">
            {event.title}
          </h3>

          {/* Description - 2 lines */}
          <p className="text-[11px] sm:text-xs text-gray-600 mb-2 line-clamp-2">
            {event.description}
          </p>

          {/* Date, Time & Venue - Single Line */}
          <div className="flex items-center text-[10px] sm:text-xs text-gray-600 mb-2 overflow-hidden">
            <span className="truncate">
              {format(new Date(event.start_datetime), 'EEE, MMM d')} • {format(new Date(event.start_datetime), 'h a')} • {event.venue_name || event.city}
            </span>
          </div>

          {/* Price */}
          <div className="pt-2 border-t border-gray-100">
            {isFree ? (
              <span className="text-sm sm:text-base font-bold text-success-600">
                From $0
              </span>
            ) : (
              <span className="text-sm sm:text-base font-bold text-gray-900">
                From ${event.ticket_price}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
