import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import EventCard from '@/components/EventCard'
import EmptyState from '@/components/EmptyState'
import Link from 'next/link'
import type { Database } from '@/types/database'
import { Heart, TrendingUp } from 'lucide-react'

type Event = Database['public']['Tables']['events']['Row']

export const revalidate = 0

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
    // First, get the event IDs from favorites
    const { data: favorites, error: favError } = await supabase
      .from('event_favorites')
      .select('event_id')
      .eq('user_id', user.id)
    
    if (!favError && favorites && favorites.length > 0) {
      const eventIds = favorites.map((f: any) => f.event_id)
      
      // Then fetch the actual events with organizer info
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*, users!events_organizer_id_fkey(full_name, is_verified)')
        .in('id', eventIds)
        .eq('is_published', true)
      
      if (!eventsError && events) {
        favoriteEvents = events
      }
    }
  } catch (error) {
    // Table doesn't exist yet, show empty state
    console.log('Event favorites table not found:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
