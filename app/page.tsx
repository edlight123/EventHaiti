import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import EventCard from '@/components/EventCard'
import EventCardHorizontal from '@/components/EventCardHorizontal'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import SearchBar from '@/components/SearchBar'
import CategoryGrid from '@/components/CategoryGrid'
import { Suspense } from 'react'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import FeaturedCarousel from '@/components/FeaturedCarousel'
import PullToRefresh from '@/components/PullToRefresh'
import { SkeletonEventCard } from '@/components/ui/Skeleton'
import { BRAND } from '@/config/brand'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'
import { isAdmin } from '@/lib/admin'
import type { Database } from '@/types/database'
import FilterManager from '@/components/FilterManager'
import { parseFiltersFromURL } from '@/lib/filters/utils'
import { applyFiltersAndSort } from '@/lib/filters/apply'

type Event = Database['public']['Tables']['events']['Row']

export const revalidate = 0

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getCurrentUser()
  const params = await searchParams
  
  // Parse filters from URL
  const urlParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) urlParams.set(key, String(value))
  })
  const filters = parseFiltersFromURL(urlParams)
  
  let events: Event[] = []
  
  if (isDemoMode()) {
    // Use demo events in demo mode
    events = DEMO_EVENTS as Event[]
  } else {
    // Fetch real events from database
    const supabase = await createClient()
    
    const now = new Date().toISOString()
    console.log('Home page - fetching events after:', now)
    
    let query = supabase
      .from('events')
      .select('*, users!events_organizer_id_fkey(full_name, is_verified)')
      .eq('is_published', true)
      .gte('start_datetime', now)
    
    const result = await query
    console.log('Home page - query result:', result)
    console.log('Home page - events found:', result.data?.length || 0)
    if (result.data && result.data.length > 0) {
      console.log('First event:', result.data[0])
    }
    
    events = result.data || []
  }

  // Apply filters and sorting using new filter system
  events = applyFiltersAndSort(events, filters)
  
  // Organize events into sections
  const now = new Date()
  
  // Use top events with most tickets sold as "featured"
  const featuredEvents = [...events]
    .sort((a, b) => (b.tickets_sold || 0) - (a.tickets_sold || 0))
    .slice(0, 5)
    .map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: new Date(e.start_datetime),
      imageUrl: e.banner_image_url || '/placeholder-event.jpg',
      location: `${e.venue_name}, ${e.city}`,
      category: e.category,
      price: e.ticket_price,
      isFeatured: true,
      isVIP: (e.ticket_price || 0) > 100,
    }))
  
  const trendingEvents = events.filter(e => (e.tickets_sold || 0) > 10).slice(0, 6)
  const thisWeekEnd = new Date(now)
  thisWeekEnd.setDate(now.getDate() + 7)
  const upcomingThisWeek = events.filter(e => new Date(e.start_datetime) <= thisWeekEnd).slice(0, 6)
  
  // Check if we have any active filters
  const hasActiveFilters = filters.date !== 'any' || 
                          filters.city !== '' || 
                          filters.categories.length > 0 || 
                          filters.price !== 'any' || 
                          filters.eventType !== 'all'

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />

      {/* Demo Mode Banner */}
      {isDemoMode() && (
        <div className="bg-gradient-to-r from-warning-50 to-warning-100 border-b border-warning-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-warning-800">
              <span className="text-lg">🎭</span>
              <p className="text-sm font-medium">
                <strong>Demo Mode:</strong> You&apos;re viewing sample events. Login with <code className="bg-warning-100 px-1.5 py-0.5 rounded">demo-organizer@eventhaiti.com</code> or <code className="bg-warning-100 px-1.5 py-0.5 rounded">demo-attendee@eventhaiti.com</code> (password: <code className="bg-warning-100 px-1.5 py-0.5 rounded">demo123</code>)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HERO: Featured Carousel OR Search Hero */}
      {!hasActiveFilters && featuredEvents.length > 0 ? (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <FeaturedCarousel events={featuredEvents} />
        </div>
      ) : (
        <div className="relative bg-gradient-to-br from-brand-600 via-brand-700 to-accent-600 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 relative">
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 drop-shadow-lg">
                {hasActiveFilters ? 'Find Your Perfect Event' : BRAND.tagline || 'Discover Events in Haiti'}
              </h1>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-brand-50 max-w-2xl mx-auto drop-shadow-md">
                Search concerts, parties, conferences, festivals, and more across Haiti
              </p>
            </div>
            <SearchBar />
          </div>
        </div>
      )}

      {/* Search/Filter Bar (always visible below hero) */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3 md:py-4">
          <FilterManager />
        </div>
      </div>

      {/* Main Content */}
      <PullToRefresh onRefresh={async () => {
        'use server'
        // This will trigger a full page refresh to reload events
        const { revalidatePath } = await import('next/cache')
        revalidatePath('/')
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        
          {/* SEARCH RESULTS VIEW */}
          {hasActiveFilters ? (
          <div className="space-y-4 sm:space-y-6 md:space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Filtered Results</h2>
                <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1 sm:mt-2">{events.length} events found</p>
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
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl shadow-soft">
                <div className="text-7xl mb-6">🔍</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No events found</h3>
                <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
                <a
                  href="/"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl hover:shadow-glow transition-all duration-300 font-semibold"
                >
                  View All Events
                </a>
              </div>
            )}
          </div>
        ) : (
          /* DISCOVERY VIEW - Premium Sections */
          <div className="space-y-8 sm:space-y-12 md:space-y-16">
            
            {/* Browse by Category */}
            <section>
              <div className="mb-4 sm:mb-6 md:mb-8">
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-brand-600 to-gray-900 bg-clip-text text-transparent mb-1 sm:mb-2">
                  Browse by Category
                </h2>
                <p className="text-gray-600 text-sm sm:text-base md:text-lg">Find events that match your interests</p>
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
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">🔥 Trending Now</h2>
                    <p className="text-gray-600 text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1">Hot events everyone is talking about</p>
                  </div>
                  <a href="/discover?sort=popular" className="text-brand-600 hover:text-brand-700 font-semibold">
                    View All →
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
                    {trendingEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
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
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">📅 This Week</h2>
                    <p className="text-gray-600 text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1">Don&apos;t miss out on these upcoming events</p>
                  </div>
                  <a href="/discover?date=week" className="text-brand-600 hover:text-brand-700 font-semibold">
                    View All →
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
                    {upcomingThisWeek.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </Suspense>
              </section>
            )}

            {/* All Upcoming Events */}
            <section>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">All Upcoming Events</h2>
                  <p className="text-gray-600 text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1">{events.length} events happening soon</p>
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
                    {events.slice(0, 12).map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </Suspense>
              ) : (
                <div className="text-center py-20 bg-white rounded-3xl shadow-soft">
                  <div className="text-7xl mb-6">📭</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">No upcoming events</h3>
                  <p className="text-gray-600">Check back soon for new events!</p>
                </div>
              )}
              
              {events.length > 12 && (
                <div className="text-center mt-8">
                  <a
                    href="/discover"
                    className="inline-block px-8 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl hover:shadow-glow transition-all duration-300 font-semibold"
                  >
                    Explore All Events
                  </a>
                </div>
              )}
            </section>

          </div>
        )}
        </div>
      </PullToRefresh>
      
      {/* Mobile Bottom Navigation */}
      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
