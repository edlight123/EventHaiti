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
import { db } from '@/lib/firebase/client'
import { collection, query, where, getDocs, documentId } from 'firebase/firestore'

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
      const favoritesRef = collection(db, 'event_favorites')
      const favoritesQuery = query(favoritesRef, where('user_id', '==', userId))
      const favoritesSnapshot = await getDocs(favoritesQuery)
      
      console.log('Favorites query result:', { count: favoritesSnapshot.size })
      
      if (!favoritesSnapshot.empty) {
        const eventIds = favoritesSnapshot.docs.map(doc => doc.data().event_id)
        console.log('Favorite event IDs:', eventIds)
        
        // Then fetch the actual events
        const eventsRef = collection(db, 'events')
        const eventsQuery = query(
          eventsRef,
          where(documentId(), 'in', eventIds),
          where('status', '==', 'published')
        )
        const eventsSnapshot = await getDocs(eventsQuery)
        
        console.log('Events query result:', { count: eventsSnapshot.size })
        
        if (!eventsSnapshot.empty) {
          // Fetch organizer info for each event
          const eventsWithOrganizers = await Promise.all(
            eventsSnapshot.docs.map(async (eventDoc) => {
              const eventData = eventDoc.data()
              
              // Fetch organizer info
              const usersRef = collection(db, 'users')
              const organizerQuery = query(usersRef, where(documentId(), '==', eventData.organizer_id))
              const organizerSnapshot = await getDocs(organizerQuery)
              
              const organizerData = organizerSnapshot.empty
                ? { full_name: 'Event Organizer', is_verified: false }
                : organizerSnapshot.docs[0].data()
              
              return {
                id: eventDoc.id,
                title: eventData.title || '',
                description: eventData.description || '',
                start_datetime: eventData.start_datetime?.toDate?.().toISOString() || new Date().toISOString(),
                end_datetime: eventData.end_datetime?.toDate?.().toISOString() || new Date().toISOString(),
                venue_name: eventData.venue_name || '',
                address: eventData.address || '',
                city: eventData.city || '',
                commune: eventData.commune || '',
                department: eventData.department || '',
                location: eventData.location || null,
                category: eventData.category || 'other',
                ticket_price: eventData.ticket_price || 0,
                currency: eventData.currency || 'HTG',
                total_tickets: eventData.total_tickets || 0,
                tickets_sold: eventData.tickets_sold || 0,
                image_url: eventData.image_url || null,
                banner_image_url: eventData.banner_image_url || eventData.image_url || null,
                organizer_id: eventData.organizer_id || '',
                is_published: eventData.is_published ?? true,
                tags: eventData.tags || [],
                created_at: eventData.created_at?.toDate?.().toISOString() || new Date().toISOString(),
                updated_at: eventData.updated_at?.toDate?.().toISOString() || new Date().toISOString(),
                users: {
                  full_name: organizerData.full_name || 'Event Organizer',
                  is_verified: organizerData.is_verified ?? false
                }
              } as Event
            })
          )
          setFavoriteEvents(eventsWithOrganizers)
        } else {
          setFavoriteEvents([])
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
