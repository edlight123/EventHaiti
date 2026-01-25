'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import OrganizerEventsTopBar from '@/components/organizer/events-manager/OrganizerEventsTopBar'
import OrganizerEventsTabs, { type EventTabType } from '@/components/organizer/events-manager/OrganizerEventsTabs'
import OrganizerEventsFiltersModal, { type EventFilters } from '@/components/organizer/events-manager/OrganizerEventsFiltersModal'
import OrganizerEventCard from '@/components/organizer/events-manager/OrganizerEventCard'
import CalendarView from '@/components/organizer/events-manager/CalendarView'
import EventCardSkeleton from '@/components/organizer/events-manager/EventCardSkeleton'
import EventsEmptyState from '@/components/organizer/events-manager/EventsEmptyState'
import QuickLinksBar from '@/components/organizer/events-manager/QuickLinksBar'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'
import { getOrganizerEventsClient } from '@/lib/data/events.client'
import { debounce } from '@/lib/data/utils'
import Link from 'next/link'
import { useOrganizerClientGuard } from '@/lib/hooks/useOrganizerClientGuard'

export default function OrganizerEventsPage() {
  const router = useRouter()

  const { firebaseUser, navbarUser, loading: authLoading } = useOrganizerClientGuard({
    loginRedirectPath: '/organizer/events',
    upgradeRedirectPath: '/organizer/events',
  })
  
  // State
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [lastDoc, setLastDoc] = useState<any>(null)
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
  
  // Fetch first page of events once authenticated.
  useEffect(() => {
    if (authLoading) return
    if (!firebaseUser) return

    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)

        if (isDemoMode()) {
          if (cancelled) return
          setEvents(DEMO_EVENTS)
          setHasMore(false)
          setLastDoc(null)
          return
        }

        const result = await getOrganizerEventsClient(firebaseUser.uid, 50)
        if (cancelled) return

        setEvents(result.data)
        setHasMore(Boolean(result.hasMore))
        setLastDoc(result.lastDoc)
      } catch (error) {
        console.error('Error fetching events:', error)
        if (!cancelled) {
          setEvents([])
          setHasMore(false)
          setLastDoc(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [authLoading, firebaseUser])

  const handleLoadMore = async () => {
    if (!firebaseUser) return
    if (!hasMore || !lastDoc) return
    if (loadingMore) return

    try {
      setLoadingMore(true)
      const result = await getOrganizerEventsClient(firebaseUser.uid, 50, lastDoc)
      const next = result.data || []

      setEvents((prev) => {
        const existingIds = new Set(prev.map((e: any) => String(e?.id || '')))
        const deduped = next.filter((e: any) => !existingIds.has(String(e?.id || '')))
        return [...prev, ...deduped]
      })

      setHasMore(Boolean(result.hasMore))
      setLastDoc(result.lastDoc)
    } catch (error) {
      console.error('Error loading more events:', error)
    } finally {
      setLoadingMore(false)
    }
  }

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
      <div className="bg-gradient-to-br from-gray-50 to-gray-100">
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
      </div>
    )
  }

  // Redirect if not logged in
  if (!firebaseUser) {
    return null
  }

  const hasSearchOrFilters = Boolean(searchQuery || activeFiltersCount > 0)

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100">
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentEvents.map((event) => (
                <OrganizerEventCard
                  key={event.id}
                  event={event}
                  showNeedsAttention={activeTab === 'upcoming' || activeTab === 'drafts'}
                />
              ))}
            </div>

            {hasMore && view === 'list' && !hasSearchOrFilters && (
              <div className="flex justify-center mt-8">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 font-medium disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : 'Load more events'}
                </button>
              </div>
            )}
          </>
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
    </div>
  )
}
