import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PullToRefresh from '@/components/PullToRefresh'
import HeroSection from '@/components/HeroSection'
import HomePageContent from '@/components/HomePageContent'
import { BRAND } from '@/config/brand'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'
import { isAdmin } from '@/lib/admin'
import type { Database } from '@/types/database'
import FilterManager from '@/components/FilterManager'
import { parseFiltersFromURL } from '@/lib/filters/utils'
import { applyFiltersAndSort } from '@/lib/filters/apply'
import { getDiscoverEvents } from '@/lib/data/events'

type Event = Database['public']['Tables']['events']['Row']

// Revalidate every 2 minutes for public home page
export const revalidate = 120

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
  
  let events: any[] = []
  
  if (isDemoMode()) {
    // Use demo events in demo mode
    events = DEMO_EVENTS as any[]
  } else {
    // Fetch events using optimized data layer with caching (30s revalidation)
    events = await getDiscoverEvents(filters, 100)
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
      <HeroSection 
        hasActiveFilters={hasActiveFilters}
        featuredEvents={featuredEvents}
        brandTagline={BRAND.tagline}
      />

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
          <HomePageContent 
            hasActiveFilters={hasActiveFilters}
            events={events}
            trendingEvents={trendingEvents}
            upcomingThisWeek={upcomingThisWeek}
          />
        </div>
      </PullToRefresh>
      
      {/* Mobile Bottom Navigation */}
      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
