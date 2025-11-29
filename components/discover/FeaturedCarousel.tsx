'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Database } from '@/types/database'
import { formatEventDate, getPriceLabel, getLocationSummary } from '@/lib/discover/helpers'

type Event = Database['public']['Tables']['events']['Row']

interface FeaturedCarouselProps {
  events: Event[]
}

export function FeaturedCarousel({ events }: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (events.length === 0) return null

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? events.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === events.length - 1 ? 0 : prev + 1))
  }

  const visibleEvents = events.slice(0, 6) // Max 6 featured events

  return (
    <div className="relative">
      {/* Desktop: Grid of 3 */}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        {visibleEvents.map((event) => (
          <FeaturedEventCard key={event.id} event={event} />
        ))}
      </div>

      {/* Mobile: Carousel */}
      <div className="md:hidden relative">
        <div className="overflow-hidden">
          <div 
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {visibleEvents.map((event) => (
              <div key={event.id} className="w-full flex-shrink-0">
                <FeaturedEventCard event={event} />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows */}
        {visibleEvents.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all z-10"
            >
              <ChevronLeft className="w-5 h-5 text-gray-900" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all z-10"
            >
              <ChevronRight className="w-5 h-5 text-gray-900" />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {visibleEvents.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {visibleEvents.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-black w-6' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FeaturedEventCard({ event }: { event: Event }) {
  const priceLabel = getPriceLabel(event.ticket_price)
  const locationSummary = getLocationSummary(event.city, event.commune)
  const dateLabel = formatEventDate(event.start_datetime)

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border-2 border-brand-500/20 hover:border-brand-500"
    >
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-brand-100 to-accent-100">
        <Image
          src={event.banner_image_url || '/placeholder-event.jpg'}
          alt={event.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        
        {/* Featured Badge */}
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full text-xs font-bold text-white shadow-lg flex items-center gap-1">
          ⭐ Featured
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/80 backdrop-blur-sm rounded-full text-sm font-semibold text-white">
          {priceLabel}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        {/* Category */}
        <div className="text-xs font-semibold text-brand-600 uppercase tracking-wide">
          {event.category}
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 line-clamp-2 text-xl group-hover:text-brand-600 transition-colors">
          {event.title}
        </h3>

        {/* Date */}
        <div className="text-sm text-gray-600">
          📅 {dateLabel}
        </div>

        {/* Location */}
        <div className="text-sm text-gray-600">
          📍 {locationSummary}
        </div>
      </div>
    </Link>
  )
}
