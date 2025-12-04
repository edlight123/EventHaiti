'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Database } from '@/types/database'
import { DiscoverEventCard } from './DiscoverEventCard'

type Event = Database['public']['Tables']['events']['Row']

interface EventsSectionProps {
  title: string
  description?: string
  emoji?: string
  events: Event[]
  seeAllLink?: string
  seeAllLabel?: string
}

export function EventsSection({ 
  title, 
  description, 
  emoji, 
  events, 
  seeAllLink, 
  seeAllLabel
}: EventsSectionProps) {
  const { t } = useTranslation('common')
  
  if (events.length === 0) {
    return null
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            {emoji && <span>{emoji}</span>}
            {title}
          </h2>
          {description && (
            <p className="text-gray-600 text-sm sm:text-base mt-1">{description}</p>
          )}
        </div>
        {seeAllLink && events.length >= 8 && (
          <Link
            href={seeAllLink}
            className="flex items-center gap-1 text-brand-600 hover:text-brand-700 font-semibold text-sm sm:text-base transition-colors"
          >
            {seeAllLabel || t('common.seeAll')}
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Events Grid - Mobile: Horizontal scroll, Desktop: Grid */}
      {/* Mobile */}
      <div className="md:hidden overflow-x-auto -mx-4 px-4 pb-2">
        <div className="flex gap-4 min-w-max">
          {events.slice(0, 8).map(event => (
            <div key={event.id} className="w-[280px]">
              <DiscoverEventCard event={event} />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {events.slice(0, 8).map(event => (
          <DiscoverEventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  )
}
