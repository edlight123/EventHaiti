import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
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
import { getUserProfileAdmin } from '@/lib/firestore/user-profile-admin'

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
  
  // Get user's default country for prioritization
  let userCountry = 'HT' // Default to Haiti
  if (user?.uid) {
    try {
      const profile = await getUserProfileAdmin(user.uid)
      userCountry = profile?.defaultCountry || 'HT'
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    }
  }
  
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

  // Safety: never show ended events on Home.
  const now = new Date()
  const notEnded = (event: any) => {
    const start = event?.start_datetime ? new Date(event.start_datetime) : null
    const end = event?.end_datetime ? new Date(event.end_datetime) : null

    if (end && !Number.isNaN(end.getTime())) return end.getTime() >= now.getTime()
    if (start && !Number.isNaN(start.getTime())) return start.getTime() >= now.getTime()
    return false
  }

  events = events.filter(notEnded)
  
  // Prioritize events from user's country
  const eventsInUserCountry = events.filter(e => e.country === userCountry)
  const eventsInOtherCountries = events.filter(e => e.country !== userCountry)
  const prioritizedEvents = [...eventsInUserCountry, ...eventsInOtherCountries]
  
  // Organize events into sections
  
  // Use top events with most tickets sold as "featured" (prioritize user's country)
  const featuredEvents = [...prioritizedEvents]
    .sort((a, b) => (b.tickets_sold || 0) - (a.tickets_sold || 0))
    .slice(0, 5)
    .map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.start_datetime, // Keep as ISO string, don't convert to Date
      imageUrl: e.banner_image_url || '/placeholder-event.jpg',
      location: `${e.venue_name}, ${e.city}`,
      category: e.category,
      price: e.ticket_price,
      isFeatured: true,
      isVIP: (e.ticket_price || 0) > 100,
    }))
  
  const trendingEvents = prioritizedEvents
    .filter(notEnded)
    .filter(e => (e.tickets_sold || 0) > 10)
    .slice(0, 6)
  const thisWeekEnd = new Date(now)
  thisWeekEnd.setDate(now.getDate() + 7)
  const upcomingThisWeek = prioritizedEvents
    .filter(notEnded)
    .filter(e => {
      const start = new Date(e.start_datetime)
      if (Number.isNaN(start.getTime())) return false
      return start.getTime() <= thisWeekEnd.getTime()
    })
    .slice(0, 6)
  const countryEvents = eventsInUserCountry.filter(notEnded).slice(0, 6)
  
  // Check if we have any active filters
  const hasActiveFilters = filters.date !== 'any' || 
                          filters.city !== '' || 
                          filters.categories.length > 0 || 
                          filters.price !== 'any' || 
                          filters.eventType !== 'all'

  // Serialize all data before passing to client components
  const serializeData = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj
    if (obj.toDate && typeof obj.toDate === 'function') return obj.toDate().toISOString()
    if (Array.isArray(obj)) return obj.map(serializeData)
    
    const serialized: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeData(obj[key])
      }
    }
    return serialized
  }

  const serializedEvents = serializeData(events)
  const serializedFeaturedEvents = serializeData(featuredEvents)
  const serializedTrendingEvents = serializeData(trendingEvents)
  const serializedUpcomingThisWeek = serializeData(upcomingThisWeek)
  const serializedCountryEvents = serializeData(countryEvents)

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
        featuredEvents={serializedFeaturedEvents}
        brandTagline={BRAND.tagline}
      />

      {/* Search/Filter Bar (always visible below hero) */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3 md:py-4">
          <FilterManager />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        <HomePageContent 
            hasActiveFilters={hasActiveFilters}
            events={serializedEvents}
            trendingEvents={serializedTrendingEvents}
            upcomingThisWeek={serializedUpcomingThisWeek}
            countryEvents={serializedCountryEvents}
            userCountry={userCountry}
          />
        </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
