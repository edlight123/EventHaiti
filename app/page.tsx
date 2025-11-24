import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import EventCard from '@/components/EventCard'
import Navbar from '@/components/Navbar'
import SearchBar from '@/components/SearchBar'
import CategoryGrid from '@/components/CategoryGrid'
import DateFilters from '@/components/DateFilters'
import EventSearchFilters from '@/components/EventSearchFilters'
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar user={user} />

      {/* Demo Mode Banner */}
      {isDemoMode() && (
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-yellow-800">
              <span className="text-lg">🎭</span>
              <p className="text-sm font-medium">
                <strong>Demo Mode:</strong> You&apos;re viewing sample events. Login with <code className="bg-yellow-100 px-1.5 py-0.5 rounded">demo-organizer@eventhaiti.com</code> or <code className="bg-yellow-100 px-1.5 py-0.5 rounded">demo-attendee@eventhaiti.com</code> (password: <code className="bg-yellow-100 px-1.5 py-0.5 rounded">demo123</code>)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section with Search */}
      <div className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-orange-600 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
          <div className="text-center mb-10">
            <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 drop-shadow-lg">
              {BRAND.tagline || 'Discover Events in Haiti'}
            </h1>
            <p className="text-xl md:text-2xl text-teal-50 max-w-2xl mx-auto mb-10 drop-shadow-md">
              Find and book tickets for concerts, parties, conferences, festivals, and more across Haiti.
            </p>
          </div>
          
          <SearchBar />
          
          {/* Filters inside hero for better visibility */}
          <div className="mt-8">
            <EventSearchFilters />
          </div>
        </div>
      </div>

      {/* Events Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Category Icons */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Browse by Category</h2>
          <CategoryGrid />
        </div>

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            {params.q || params.location || params.city || params.category 
              ? 'Search Results' 
              : 'Upcoming Events'}
          </h2>
        </div>

        {events && events.length > 0 ? (
          <>
            <p className="text-gray-600 mb-8 text-lg">{events.length} events found</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg">
            <div className="text-7xl mb-6">🔍</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No events found</h3>
            <p className="text-gray-600 mb-6 text-lg">
              Try adjusting your search or filters
            </p>
            <a
              href="/"
              className="inline-block px-8 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl hover:from-teal-700 hover:to-teal-800 shadow-lg hover:shadow-xl transition-all duration-300 font-medium"
            >
              View all events
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
