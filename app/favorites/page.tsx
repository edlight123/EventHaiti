import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import EventCard from '@/components/EventCard'
import Link from 'next/link'
import type { Database } from '@/types/database'

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
    const { data: favorites, error } = await supabase
      .from('favorites')
      .select(`
        event:events (*)
      `)
      .eq('user_id', user.id)
    
    if (!error && favorites) {
      favoriteEvents = favorites.map((f: any) => f.event).filter(Boolean)
    }
  } catch (error) {
    // Table doesn't exist yet, show empty state
    console.log('Favorites table not found')
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
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No favorites yet</h3>
            <p className="text-gray-600 mb-6">
              Start exploring events and save your favorites
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 rounded-full bg-orange-600 text-white font-medium hover:bg-orange-700 transition"
            >
              Discover Events
            </Link>
          </div>
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
