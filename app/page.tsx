import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import EventCard from '@/components/EventCard'
import Navbar from '@/components/Navbar'
import SearchBar from '@/components/SearchBar'
import CategoryGrid from '@/components/CategoryGrid'
import DateFilters from '@/components/DateFilters'
import EventSearchFilters from '@/components/EventSearchFilters'
import FeaturedCarousel from '@/components/FeaturedCarousel'
import { SkeletonEventCard } from '@/components/ui/Skeleton'
import { BRAND } from '@/config/brand'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'
import type { Database } from '@/types/database'

type Event = Database['public']['Tables']['events']['Row']

export const revalidate = 0

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ 
    q?: string
    location?: string
    category?: string
    date?: string
    city?: string
    dateFrom?: string
    dateTo?: string
    minPrice?: string
    maxPrice?: string
    sort?: string
  }>
}) {
  const user = await getCurrentUser()
  const params = await searchParams
  
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

  // Apply filters
  if (params.q) {
    const searchLower = params.q.toLowerCase()
    events = events.filter(e => 
      e.title.toLowerCase().includes(searchLower) || 
      e.description.toLowerCase().includes(searchLower)
    )
  }

  // City filter (from both old and new params)
  const cityFilter = params.city || params.location
  if (cityFilter) {
    events = events.filter(e => e.city === cityFilter)
  }

  if (params.category) {
    events = events.filter(e => e.category === params.category)
  }

  // Date range filter (new advanced filters)
  if (params.dateFrom) {
    const fromDate = new Date(params.dateFrom)
    events = events.filter(e => new Date(e.start_datetime) >= fromDate)
  }
  
  if (params.dateTo) {
    const toDate = new Date(params.dateTo)
    toDate.setHours(23, 59, 59, 999) // End of day
    events = events.filter(e => new Date(e.start_datetime) <= toDate)
  }

  // Price range filter (new advanced filters)
  if (params.minPrice) {
    const minPrice = parseFloat(params.minPrice)
    events = events.filter(e => (e.ticket_price || 0) >= minPrice)
  }
  
  if (params.maxPrice) {
    const maxPrice = parseFloat(params.maxPrice)
    events = events.filter(e => (e.ticket_price || 0) <= maxPrice)
  }

  // Legacy date filter (for backward compatibility)
  if (params.date) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    events = events.filter(e => {
      const eventDate = new Date(e.start_datetime)
      
      switch (params.date) {
        case 'today':
          return eventDate.toDateString() === today.toDateString()
        case 'tomorrow':
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          return eventDate.toDateString() === tomorrow.toDateString()
        case 'weekend':
          const dayOfWeek = eventDate.getDay()
          const isThisWeekend = dayOfWeek === 0 || dayOfWeek === 6
          const weekEnd = new Date(today)
          weekEnd.setDate(today.getDate() + 7)
          return isThisWeekend && eventDate <= weekEnd
        case 'week':
          const weekFromNow = new Date(today)
          weekFromNow.setDate(today.getDate() + 7)
          return eventDate <= weekFromNow
        case 'month':
          const monthFromNow = new Date(today)
          monthFromNow.setMonth(today.getMonth() + 1)
          return eventDate <= monthFromNow
        default:
          return true
      }
    })
  }

  // Apply sorting
  if (params.sort) {
    switch (params.sort) {
      case 'date':
        events.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
        break
      case 'price-low':
        events.sort((a, b) => (a.ticket_price || 0) - (b.ticket_price || 0))
        break
      case 'price-high':
        events.sort((a, b) => (b.ticket_price || 0) - (a.ticket_price || 0))
        break
      case 'popular':
        events.sort((a, b) => (b.tickets_sold || 0) - (a.tickets_sold || 0))
        break
      default:
        // Default sort by date
        events.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
    }
  } else {
    // Default sort by date if no sort specified
    events.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
  }

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
  
  // Check if we're in search/filter mode
  const isSearching = params.q || params.location || params.city || params.category || params.dateFrom || params.dateTo

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

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
      {!isSearching && featuredEvents.length > 0 ? (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <FeaturedCarousel events={featuredEvents} />
        </div>
      ) : (
        <div className="relative bg-gradient-to-br from-brand-600 via-brand-700 to-accent-600 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                {isSearching ? 'Find Your Perfect Event' : BRAND.tagline || 'Discover Events in Haiti'}
              </h1>
              <p className="text-lg md:text-xl text-brand-50 max-w-2xl mx-auto drop-shadow-md">
                Search concerts, parties, conferences, festivals, and more across Haiti
              </p>
            </div>
            <SearchBar />
          </div>
        </div>
      )}

      {/* Search/Filter Bar (always visible below hero) */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <EventSearchFilters />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* SEARCH RESULTS VIEW */}
        {isSearching ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Search Results</h2>
                <p className="text-gray-600 mt-2">{events.length} events found</p>
              </div>
            </div>

            {events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
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
          <div className="space-y-16">
            
            {/* Browse by Category */}
            <section>
              <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-brand-600 to-gray-900 bg-clip-text text-transparent mb-2">
                  Browse by Category
                </h2>
                <p className="text-gray-600 text-lg">Find events that match your interests</p>
              </div>
              <CategoryGrid />
            </section>

            {/* Trending Events */}
            {trendingEvents.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">🔥 Trending Now</h2>
                    <p className="text-gray-600 mt-1">Hot events everyone is talking about</p>
                  </div>
                  <a href="/discover?sort=popular" className="text-brand-600 hover:text-brand-700 font-semibold">
                    View All →
                  </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trendingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming This Week */}
            {upcomingThisWeek.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">📅 This Week</h2>
                    <p className="text-gray-600 mt-1">Don&apos;t miss out on these upcoming events</p>
                  </div>
                  <a href="/discover?date=week" className="text-brand-600 hover:text-brand-700 font-semibold">
                    View All →
                  </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingThisWeek.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}

            {/* All Upcoming Events */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">All Upcoming Events</h2>
                  <p className="text-gray-600 mt-1">{events.length} events happening soon</p>
                </div>
              </div>
              {events.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.slice(0, 12).map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
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
    </div>
  )
}
