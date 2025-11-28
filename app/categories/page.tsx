import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PullToRefresh from '@/components/PullToRefresh'
import CategoryGrid from '@/components/CategoryGrid'
import EventCard from '@/components/EventCard'
import type { Database } from '@/types/database'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'

type Event = Database['public']['Tables']['events']['Row']

export const revalidate = 0

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const user = await getCurrentUser()
  const params = await searchParams
  
  let events: Event[] = []
  
  if (isDemoMode()) {
    events = DEMO_EVENTS as Event[]
  } else {
    const supabase = await createClient()
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('is_published', true)
      .gte('start_datetime', new Date().toISOString())
      .order('start_datetime', { ascending: true })
    
    events = data || []
  }

  // Filter by category if selected
  if (params.category) {
    events = events.filter(e => e.category === params.category)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />

      <PullToRefresh onRefresh={async () => {
        'use server'
        const { revalidatePath } = await import('next/cache')
        revalidatePath('/categories')
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Browse by Category</h1>
            <p className="text-[13px] md:text-base text-gray-600 mt-1 md:mt-2">Find events that match your interests</p>
          </div>

          {/* Category Grid */}
          <div className="mb-8 md:mb-12">
            <CategoryGrid />
          </div>

          {/* Events in Selected Category */}
          {params.category && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6 capitalize">
                {params.category} Events
              </h2>
              {events.length === 0 ? (
                <div className="text-center py-12 md:py-16 bg-white rounded-xl md:rounded-2xl border border-gray-200">
                  <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-orange-100 mb-3 md:mb-4">
                    <svg className="w-7 h-7 md:w-8 md:h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
                    No {params.category} events yet
                  </h3>
                  <p className="text-[13px] md:text-base text-gray-600">
                    Check back later or explore other categories
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </PullToRefresh>

      <MobileNavWrapper user={user} />
    </div>
  )
}
