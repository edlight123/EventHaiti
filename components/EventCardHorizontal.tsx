'use client'

import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import Badge from './ui/Badge'
import { TrendingUp, Heart, Share2 } from 'lucide-react'
import { useState } from 'react'

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

  const [isLiked, setIsLiked] = useState(false)

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsLiked(!isLiked)
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out ${event.title}`,
          url: `/events/${event.id}`
        })
      } catch (err) {
        // User cancelled or share failed
      }
    }
  }

  return (
    <div className="group">
      <div className="rounded-xl overflow-hidden transition-all duration-300">
        
        <Link href={`/events/${event.id}`} prefetch={true} className="block">
        
        {/* Image - reduced height by 25% */}
        <div className="relative w-full aspect-[2/1] bg-gray-200">
          {event.banner_image_url ? (
            <Image
              src={event.banner_image_url}
              alt={event.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 90vw, 50vw"
              quality={75}
              loading="lazy"
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VmZjZmZiIvPjwvc3ZnPg=="
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

          {/* Price with Share & Like Buttons */}
          <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
            <div>
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

            {/* Share & Like Buttons */}
            <div className="flex gap-1 flex-shrink-0">
              <button 
                onClick={handleLike}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Like event"
              >
                <Heart 
                  className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
                />
              </button>
              <button 
                onClick={handleShare}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Share event"
              >
                <Share2 className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
        </Link>
      </div>
    </div>
  )
}
