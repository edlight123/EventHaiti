'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import EventCard from '@/components/EventCard'
import EventCardHorizontal from '@/components/EventCardHorizontal'
import PullToRefresh from '@/components/PullToRefresh'
import EmptyState from '@/components/EmptyState'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import type { Database } from '@/types/database'
import { Heart, TrendingUp } from 'lucide-react'
import { firebaseDb } from '@/lib/firebase-db/client'

type Event = Database['public']['Tables']['events']['Row']

interface FavoritesContentProps {
  userId: string
}

export default function FavoritesContent({ userId }: FavoritesContentProps) {
  const { t } = useTranslation('favorites')
  const [favoriteEvents, setFavoriteEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  const loadFavorites = async () => {
    setLoading(true)
    try {
      console.log('=== FAVORITES PAGE QUERY ===')
      console.log('User ID:', userId)
      
      // First, get the event IDs from favorites
      const { data: favorites, error: favError } = await firebaseDb
        .from('event_favorites')
        .select('event_id')
        .eq('user_id', userId)
      
      console.log('Favorites query result:', { count: favorites?.length, error: favError })
      if (favorites?.length) {
        console.log('Favorite event IDs:', favorites.map((f: any) => f.event_id))
      }
      
      if (!favError && favorites && favorites.length > 0) {
        const eventIds = favorites.map((f: any) => f.event_id)
        
        // Then fetch the actual events
        const { data: events, error: eventsError } = await firebaseDb
          .from('events')
          .select('*')
          .in('id', eventIds)
          .eq('is_published', true)
        
        console.log('Events query result:', { count: events?.length, error: eventsError })
        
        if (!eventsError && events) {
          // Fetch organizer info for each event
          const eventsWithOrganizers = await Promise.all(
            events.map(async (event: any) => {
              const { data: organizerData } = await firebaseDb
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
          setFavoriteEvents(eventsWithOrganizers)
        }
      } else {
        setFavoriteEvents([])
      }
    } catch (error) {
      console.error('Error fetching favorites:', error)
      setFavoriteEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFavorites()
  }, [userId])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-2">{t('subtitle')}</p>
        </div>
        <LoadingSkeleton rows={8} animated />
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={loadFavorites}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-2">{t('subtitle')}</p>
        </div>

        {favoriteEvents.length === 0 ? (
          <EmptyState
            icon={Heart}
            title={t('empty.title')}
            description={t('empty.description')}
            actionLabel={t('empty.action')}
            actionHref="/"
            actionIcon={TrendingUp}
          />
        ) : (
          <>
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
          </>
        )}
      </div>
    </PullToRefresh>
  )
}
