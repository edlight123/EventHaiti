// Event Discovery Page
// Removed Suspense wrapper to fix React errors #425 and #422
// Client components with useSearchParams cannot be inside Suspense boundaries
// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/firebase-db/server'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { isAdmin } from '@/lib/admin'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'
import type { Database } from '@/types/database'
import { parseFiltersFromURL } from '@/lib/filters/utils'
import { applyFiltersAndSort } from '@/lib/filters/apply'
import { DateChips } from '@/components/discover/DateChips'
import { CategoryChips } from '@/components/discover/CategoryChips'
import { EventsSection } from '@/components/discover/EventsSection'
import { EmptyState } from '@/components/discover/EmptyState'
import { FeaturedCarousel } from '@/components/discover/FeaturedCarousel'
import { DiscoverFilterManager } from '@/components/DiscoverFilterManager'
import { 
  getFeaturedEvents, 
  getUpcomingEvents, 
  filterFreeEvents, 
  filterEventsByPrice, 
  filterOnlineEvents,
  filterEventsByLocation,
  sortEventsDefault,
  sortEventsByDate
} from '@/lib/discover/helpers'

type Event = Database['public']['Tables']['events']['Row']

export const revalidate = 0

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getCurrentUser()
  const params = await searchParams
  
  // Parse filters from URL
  const urlParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach(v => urlParams.append(key, v))
      } else {
        urlParams.set(key, String(value))
      }
    }
  })
  const filters = parseFiltersFromURL(urlParams)
  
  let allEvents: Event[] = []
  
  if (isDemoMode()) {
    allEvents = DEMO_EVENTS as Event[]
  } else {
    const supabase = await createClient()
    const now = new Date().toISOString()
    
    const result = await supabase
      .from('events')
      .select('*, users!events_organizer_id_fkey(full_name, is_verified)')
      .eq('is_published', true)
      .gte('start_datetime', now)
    
    allEvents = result.data || []
  }

  // Apply filters and sort
  let filteredEvents = applyFiltersAndSort(allEvents, filters)
  
  // Apply sorting rules
  if (filters.sortBy === 'date') {
    filteredEvents = sortEventsByDate(filteredEvents)
  } else {
    filteredEvents = sortEventsDefault(filteredEvents)
  }
  
  // Organize into sections
  const featuredEvents = getFeaturedEvents(filteredEvents, 6)
  const upcomingEvents = getUpcomingEvents(filteredEvents, 8)
  const freeEvents = filterFreeEvents(filteredEvents)
  const budgetEvents = filterEventsByPrice(filteredEvents, 500)
  const onlineEvents = filterOnlineEvents(filteredEvents)
  const nearYouEvents = filters.city 
    ? filterEventsByLocation(allEvents, filters.city, filters.commune)
    : []

  const hasActiveFilters = filters.date !== 'any' || 
                          filters.city !== '' || 
                          filters.categories.length > 0 || 
                          filters.price !== 'any' || 
                          filters.eventType !== 'all'

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />

      {/* Top Bar with Filter Manager (includes ActiveFiltersRow) */}
      <DiscoverFilterManager />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
          <div className="space-y-8">
            {/* Date Strip */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">When</h3>
              <DateChips currentDate={filters.date} />
            </div>

            {/* Featured Carousel (only if no active filters and has featured) */}
            {!hasActiveFilters && featuredEvents.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                    ⭐ Featured This Weekend
                  </h2>
                  <p className="text-gray-600 text-sm sm:text-base mt-1">Hand-picked events you won&apos;t want to miss</p>
                </div>
                <FeaturedCarousel events={featuredEvents} />
              </div>
            )}

            {/* Category Shortcuts */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Categories</h3>
              <CategoryChips selectedCategories={filters.categories} />
            </div>

            {/* Show sections only if no active filters */}
            {!hasActiveFilters ? (
              <>
                {/* Happening Soon */}
                <EventsSection
                  title="Happening Soon"
                  description="Don't miss these upcoming events"
                  emoji="🔥"
                  events={upcomingEvents}
                  seeAllLink="/discover?date=this-week"
                />

                {/* Near You (only if location set) */}
                {nearYouEvents.length > 0 && (
                  <EventsSection
                    title="Near You"
                    description={`Events in ${filters.city}${filters.commune ? ` • ${filters.commune}` : ''}`}
                    emoji="📍"
                    events={nearYouEvents}
                    seeAllLink={`/discover?city=${filters.city}`}
                  />
                )}

                {/* Free & Budget Events */}
                {budgetEvents.length > 0 && (
                  <EventsSection
                    title="Free & Budget Friendly"
                    description="Great events at ≤ 500 HTG"
                    emoji="💰"
                    events={budgetEvents}
                    seeAllLink="/discover?price=%3C%3D500"
                  />
                )}

                {/* Online Events */}
                {onlineEvents.length > 0 && (
                  <EventsSection
                    title="Online Events"
                    description="Join from anywhere"
                    emoji="💻"
                    events={onlineEvents}
                    seeAllLink="/discover?eventType=online"
                  />
                )}

                {/* All Events Fallback */}
                {upcomingEvents.length === 0 && 
                 nearYouEvents.length === 0 && 
                 budgetEvents.length === 0 && 
                 onlineEvents.length === 0 && (
                  <EmptyState hasFilters={false} />
                )}
              </>
            ) : (
              /* Filtered Results */
              <>
                {filteredEvents.length > 0 ? (
                  <EventsSection
                    title="Filtered Results"
                    description={`${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} found`}
                    events={filteredEvents}
                  />
                ) : (
                  <EmptyState hasFilters={true} />
                )}
              </>
            )}
          </div>
        
      </div>

      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
