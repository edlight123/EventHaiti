'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import OrganizerEventsTopBar from '@/components/organizer/events-manager/OrganizerEventsTopBar'
import OrganizerEventsTabs, { type EventTabType } from '@/components/organizer/events-manager/OrganizerEventsTabs'
import OrganizerEventsFiltersModal, { type EventFilters } from '@/components/organizer/events-manager/OrganizerEventsFiltersModal'
import OrganizerEventCard from '@/components/organizer/events-manager/OrganizerEventCard'
import CalendarView from '@/components/organizer/events-manager/CalendarView'
import EventCardSkeleton from '@/components/organizer/events-manager/EventCardSkeleton'
import EventsEmptyState from '@/components/organizer/events-manager/EventsEmptyState'
import QuickLinksBar from '@/components/organizer/events-manager/QuickLinksBar'
import { auth, db } from '@/lib/firebase/client'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'
import { getOrganizerEventsClient } from '@/lib/data/events.client'
import { debounce } from '@/lib/data/utils'
import Link from 'next/link'

export default function OrganizerEventsPage() {
  const router = useRouter()
  const [firebaseUser, setFirebaseUser] = useState<any>(null)
  const [navbarUser, setNavbarUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [roleChecked, setRoleChecked] = useState(false)
  
  // State
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<EventTabType>('upcoming')
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [filters, setFilters] = useState<EventFilters>({
    dateRange: null,
    cities: [],
    categories: [],
    hasSales: null,
    sortBy: 'date',
    sortOrder: 'desc'
  })

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      setSearchQuery(value)
    }, 300),
    []
  )
  
  // Fetch events
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        router.push('/auth/login?redirect=/organizer/events')
        return
      }

      // Check user role in Firestore
      try {
        const userDocRef = doc(db, 'users', authUser.uid)
        const userDoc = await getDoc(userDocRef)
        const userData = userDoc.data()
        const userRole = userData?.role || 'attendee'

        if (userRole !== 'organizer') {
          // Not an organizer, redirect to profile
          router.push('/profile')
          return
        }

        setFirebaseUser(authUser)
        setNavbarUser({
          id: authUser.uid,
          full_name: authUser.displayName || userData?.full_name || '',
          email: authUser.email || '',
          role: 'organizer' as const
        })
        setRoleChecked(true)
      } catch (error) {
        console.error('Error checking user role:', error)
        router.push('/profile')
        return
      }
      setAuthLoading(false)

      // Fetch events using optimized data layer
      try {
        setLoading(true)
        
        if (isDemoMode()) {
          setEvents(DEMO_EVENTS)
        } else {
          // Fetch all events for this organizer (uses indexed query)
          const result = await getOrganizerEventsClient(authUser.uid, 200)
          setEvents(result.data)
        }
      } catch (error) {
        console.error('Error fetching events:', error)
        setEvents([])
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  // Filter and categorize events
  const categorizedEvents = useMemo(() => {
    const now = new Date()
    
    // First, filter by search query
    let filtered = events.filter((event) => {
      if (!searchQuery) return true
      
      const searchLower = searchQuery.toLowerCase()
      return (
        event.title?.toLowerCase().includes(searchLower) ||
        event.city?.toLowerCase().includes(searchLower) ||
        event.category?.toLowerCase().includes(searchLower) ||
        event.location_name?.toLowerCase().includes(searchLower)
      )
    })

    // Apply filters
    if (filters.dateRange?.start || filters.dateRange?.end) {
      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.start_datetime)
        if (filters.dateRange?.start && eventDate < new Date(filters.dateRange.start)) {
          return false
        }
        if (filters.dateRange?.end && eventDate > new Date(filters.dateRange.end)) {
          return false
        }
        return true
      })
    }

    if (filters.cities.length > 0) {
      filtered = filtered.filter((event) => filters.cities.includes(event.city))
    }

    if (filters.categories.length > 0) {
      filtered = filtered.filter((event) => filters.categories.includes(event.category))
    }

    if (filters.hasSales === true) {
      filtered = filtered.filter((event) => (event.tickets_sold || 0) > 0)
    } else if (filters.hasSales === false) {
      filtered = filtered.filter((event) => (event.tickets_sold || 0) === 0)
    }

    // Categorize by tab
    const upcoming = filtered.filter(
      (event) => event.is_published && new Date(event.start_datetime) >= now
    )
    const drafts = filtered.filter((event) => !event.is_published)
    const past = filtered.filter(
      (event) => event.is_published && new Date(event.start_datetime) < now && !event.is_cancelled
    )
    const cancelled = filtered.filter((event) => event.is_cancelled)

    // Apply sorting
    const sortFn = (a: any, b: any) => {
      let comparison = 0
      
      switch (filters.sortBy) {
        case 'date':
          comparison = new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
          break
        case 'sales':
          comparison = (a.tickets_sold || 0) - (b.tickets_sold || 0)
          break
        case 'created':
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
          break
        case 'alphabetical':
          comparison = (a.title || '').localeCompare(b.title || '')
          break
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison
    }

    upcoming.sort(sortFn)
    drafts.sort(sortFn)
    past.sort(sortFn)
    cancelled.sort(sortFn)

    return { upcoming, drafts, past, cancelled }
  }, [events, searchQuery, filters])

  // Get current tab events
  const currentEvents = categorizedEvents[activeTab]

  // Tab counts
  const tabCounts = {
    upcoming: categorizedEvents.upcoming.length,
    drafts: categorizedEvents.drafts.length,
    past: categorizedEvents.past.length,
    cancelled: categorizedEvents.cancelled.length
  }

  // Available cities and categories for filters
  const availableCities = useMemo(() => {
    const cities = new Set(events.map((e) => e.city).filter(Boolean))
    return Array.from(cities).sort()
  }, [events])

  const availableCategories = useMemo(() => {
    const categories = new Set(events.map((e) => e.category).filter(Boolean))
    return Array.from(categories).sort()
  }, [events])

  // Count active filters
  const activeFiltersCount =
    (filters.dateRange ? 1 : 0) +
    filters.cities.length +
    filters.categories.length +
    (filters.hasSales !== null ? 1 : 0)

  // Handle filter clear
  const handleClearFilters = () => {
    setFilters({
      dateRange: null,
      cities: [],
      categories: [],
      hasSales: null,
      sortBy: 'date',
      sortOrder: 'desc'
    })
    setSearchQuery('')
  }

  // Show loading state during auth or initial fetch
  if (authLoading || (loading && events.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-mobile-nav">
        <Navbar user={navbarUser} />
        <OrganizerEventsTopBar
          searchQuery=""
          onSearchChange={() => {}}
          view={view}
          onViewChange={setView}
          onOpenFilters={() => {}}
          activeFiltersCount={0}
        />
        <OrganizerEventsTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={{ upcoming: 0, drafts: 0, past: 0, cancelled: 0 }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        </div>
        <MobileNavWrapper user={navbarUser} />
      </div>
    )
  }

  // Redirect if not logged in
  if (!firebaseUser) {
    return null
  }

  const hasSearchOrFilters = Boolean(searchQuery || activeFiltersCount > 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-mobile-nav">
      <Navbar user={navbarUser} />

      {/* Top Bar */}
      <OrganizerEventsTopBar
        searchQuery={searchQuery}
        onSearchChange={debouncedSearch}
        view={view}
        onViewChange={setView}
        onOpenFilters={() => setShowFiltersModal(true)}
        activeFiltersCount={activeFiltersCount}
      />

      {/* Tabs */}
      <OrganizerEventsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={tabCounts}
      />

      {/* Quick Links Bar (below tabs) */}
      <QuickLinksBar />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : currentEvents.length === 0 ? (
          <EventsEmptyState
            tab={activeTab}
            hasFilters={hasSearchOrFilters}
            onClearFilters={handleClearFilters}
          />
        ) : view === 'calendar' ? (
          <CalendarView
            events={currentEvents}
            currentMonth={calendarMonth}
            onMonthChange={setCalendarMonth}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentEvents.map((event) => (
              <OrganizerEventCard
                key={event.id}
                event={event}
                showNeedsAttention={activeTab === 'upcoming' || activeTab === 'drafts'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Filters Modal */}
      <OrganizerEventsFiltersModal
        isOpen={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        filters={filters}
        onApplyFilters={setFilters}
        availableCities={availableCities}
        availableCategories={availableCategories}
      />

      <MobileNavWrapper user={navbarUser} />
    </div>
  )
}
