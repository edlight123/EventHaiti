'use client'

import { useTranslation } from 'react-i18next'
import EventCard from '@/components/EventCard'
import EventCardHorizontal from '@/components/EventCardHorizontal'
import CategoryGrid from '@/components/CategoryGrid'
import { Suspense } from 'react'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import { LOCATION_CONFIG } from '@/lib/filters/config'
import Link from 'next/link'
import { MapPin } from 'lucide-react'

interface HomePageContentProps {
  hasActiveFilters: boolean
  events: any[]
  trendingEvents: any[]
  upcomingThisWeek: any[]
  countryEvents?: any[]
  userCountry?: string
}

// Empty state component when no events in user's country
function NoEventsInCountry({ countryName, userCountry }: { countryName: string; userCountry: string }) {
  return (
    <div className="text-center py-16 sm:py-20 bg-white rounded-3xl shadow-soft">
      <div className="relative inline-block mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
          <MapPin className="w-10 h-10 text-brand-600" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3">
        No events in {countryName} yet
      </h3>
      <p className="text-gray-600 mb-8 max-w-md mx-auto px-4">
        We don&apos;t have any upcoming events in {countryName} right now. 
        Check back soon or explore events in a different location.
      </p>
      <Link
        href="/profile"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 font-semibold"
      >
        <MapPin className="w-5 h-5" />
        Change your location
      </Link>
    </div>
  )
}

export default function HomePageContent({
  hasActiveFilters,
  events,
  trendingEvents,
  upcomingThisWeek,
  countryEvents = [],
  userCountry = 'HT',
}: HomePageContentProps) {
  const { t } = useTranslation('common')
  const countryName = LOCATION_CONFIG[userCountry]?.name || 'Haiti'

  if (hasActiveFilters) {
    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              {t('events.filtered_results')}
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1 sm:mt-2">
              {events.length === 1 
                ? t('events.event_found', { count: events.length })
                : t('events.events_found', { count: events.length })}
            </p>
          </div>
        </div>

        {events.length > 0 ? (
          <>
            {/* Mobile: Horizontal Cards */}
            <div className="md:hidden space-y-3">
              {events.map((event) => (
                <EventCardHorizontal key={event.id} event={event} />
              ))}
            </div>
            
            {/* Desktop: Grid Cards */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl shadow-soft">
            <div className="text-7xl mb-6">🔍</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {t('events.no_events')}
            </h3>
            <p className="text-gray-600 mb-6">{t('common.try_different_search')}</p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl hover:shadow-glow transition-all duration-300 font-semibold"
            >
              {t('events.all_events')}
            </a>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8 sm:space-y-12 md:space-y-16">
      {/* Browse by Category */}
      <section>
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-brand-600 to-gray-900 bg-clip-text text-transparent mb-1 sm:mb-2">
            {t('events.browse_categories')}
          </h2>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg">
            {t('events.browse_categories_desc')}
          </p>
        </div>
        <Suspense fallback={<div className="space-y-3"><div className="h-6 w-40 bg-gray-200 rounded animate-pulse" /><LoadingSkeleton rows={9} animated={false} /></div>}>
          <CategoryGrid />
        </Suspense>
      </section>

      {/* Trending Events */}
      {trendingEvents.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                🔥 {t('events.trending_now')}
              </h2>
              <p className="text-gray-600 text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1">
                {t('events.trending_desc')}
              </p>
            </div>
            <a href="/discover?sort=popular" className="text-brand-600 hover:text-brand-700 font-semibold">
              {t('common.viewAll')} →
            </a>
          </div>
          <Suspense fallback={<LoadingSkeleton rows={6} animated={false} />}>
            {/* Mobile: Horizontal Cards */}
            <div className="md:hidden space-y-4">
              {trendingEvents.map((event) => (
                <EventCardHorizontal key={event.id} event={event} />
              ))}
            </div>
            {/* Desktop: Grid Cards */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingEvents.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </div>
          </Suspense>
        </section>
      )}

      {/* Events in Your Country */}
      {countryEvents.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                🌎 Events in {countryName}
              </h2>
              <p className="text-gray-600 text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1">
                Discover events happening in {countryName}
              </p>
            </div>
            <a href={`/discover?country=${userCountry}`} className="text-brand-600 hover:text-brand-700 font-semibold">
              {t('common.viewAll')} →
            </a>
          </div>
          <Suspense fallback={<LoadingSkeleton rows={6} animated={false} />}>
            {/* Mobile: Horizontal Cards */}
            <div className="md:hidden space-y-4">
              {countryEvents.map((event) => (
                <EventCardHorizontal key={event.id} event={event} />
              ))}
            </div>
            {/* Desktop: Grid Cards */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {countryEvents.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </div>
          </Suspense>
        </section>
      )}

      {/* Upcoming This Week */}
      {upcomingThisWeek.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                📅 {t('events.this_week')}
              </h2>
              <p className="text-gray-600 text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1">
                {t('events.this_week_desc')}
              </p>
            </div>
            <a href="/discover?date=week" className="text-brand-600 hover:text-brand-700 font-semibold">
              {t('common.viewAll')} →
            </a>
          </div>
          <Suspense fallback={<LoadingSkeleton rows={6} animated={false} />}>
            {/* Mobile: Horizontal Cards */}
            <div className="md:hidden space-y-4">
              {upcomingThisWeek.map((event) => (
                <EventCardHorizontal key={event.id} event={event} />
              ))}
            </div>
            {/* Desktop: Grid Cards */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingThisWeek.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </div>
          </Suspense>
        </section>
      )}

      {/* All Upcoming Events */}
      <section>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              {t('events.all_events')}
            </h2>
            <p className="text-gray-600 text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1">
              {events.length === 1
                ? t('events.event_found', { count: events.length })
                : t('events.events_found', { count: events.length })}
            </p>
          </div>
        </div>
        {events.length > 0 ? (
          <Suspense fallback={<LoadingSkeleton rows={8} animated={false} />}>
            {/* Mobile: Horizontal Cards */}
            <div className="md:hidden space-y-4">
              {events.slice(0, 12).map((event) => (
                <EventCardHorizontal key={event.id} event={event} />
              ))}
            </div>
            {/* Desktop: Grid Cards */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.slice(0, 12).map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </div>
          </Suspense>
        ) : (
          <NoEventsInCountry countryName={countryName} userCountry={userCountry} />
        )}
        
        {events.length > 12 && (
          <div className="text-center mt-8">
            <a
              href="/discover"
              className="inline-block px-8 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl hover:shadow-glow transition-all duration-300 font-semibold"
            >
              {t('events.explore_all')}
            </a>
          </div>
        )}
      </section>
    </div>
  )
}
