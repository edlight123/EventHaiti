import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import EventCard from '@/components/EventCard'
import EventCardHorizontal from '@/components/EventCardHorizontal'
import PullToRefresh from '@/components/PullToRefresh'
import EmptyState from '@/components/EmptyState'
import Link from 'next/link'
import type { Database } from '@/types/database'
import { Heart, TrendingUp } from 'lucide-react'
import { Suspense } from 'react'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'

type Event = Database['public']['Tables']['events']['Row']

export const revalidate = 30 // Cache for 30 seconds

export default async function FavoritesPage() {
  const user = await getCurrentUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={null} />
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Please sign in to view your favorites
            </h2>
            <Link
              href="/auth/login"
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const supabase = await createClient()

  // Fetch user's favorite events
  let favoriteEvents: Event[] = []
  
  try {
    console.log('=== FAVORITES PAGE QUERY ===')
    console.log('User ID:', user.id)
    
    // First, get the event IDs from favorites
    const { data: favorites, error: favError } = await supabase
      .from('event_favorites')
      .select('event_id')
      .eq('user_id', user.id)
    
    console.log('Favorites query result:', { count: favorites?.length, error: favError })
    if (favorites?.length) {
      console.log('Favorite event IDs:', favorites.map((f: any) => f.event_id))
    }
    
    if (!favError && favorites && favorites.length > 0) {
      const eventIds = favorites.map((f: any) => f.event_id)
      
      // Then fetch the actual events
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds)
        .eq('is_published', true)
      
      console.log('Events query result:', { count: events?.length, error: eventsError })
      
      if (!eventsError && events) {
        // Fetch organizer info for each event
        const eventsWithOrganizers = await Promise.all(
          events.map(async (event: any) => {
            const { data: organizerData } = await supabase
              .from('users')
              .select('full_name, is_verified')
              .eq('id', event.organizer_id)
              .single()
            
            return {
              ...event,
              users: organizerData || { full_name: 'Event Organizer', is_verified: false }
            }
          })
        )
        favoriteEvents = eventsWithOrganizers
      }
    }
  } catch (error) {
    // Table doesn't exist yet, show empty state
    console.error('Error fetching favorites:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />

      <PullToRefresh onRefresh={async () => {
        'use server'
        const { revalidatePath } = await import('next/cache')
        revalidatePath('/favorites')
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
            <p className="text-gray-600 mt-2">Events you&apos;ve saved for later</p>
          </div>

          {favoriteEvents.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="No favorites yet"
              description="Start exploring events and save your favorites to see them here"
              actionLabel="Discover Events"
              actionHref="/"
              actionIcon={TrendingUp}
            />
          ) : (
            <Suspense fallback={<LoadingSkeleton rows={8} animated={false} />}>
              {/* Mobile: Horizontal Cards */}
              <div className="md:hidden space-y-4">
                {favoriteEvents.map((event) => (
                  <EventCardHorizontal key={event.id} event={event} />
                ))}
              </div>
              
              {/* Desktop: Grid Cards */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </Suspense>
          )}
        </div>
      </PullToRefresh>
      
      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
