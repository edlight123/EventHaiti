import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { getEventById, checkIsFavorite, checkIsFollowing } from '@/lib/data/events'
import { adminDb } from '@/lib/firebase/admin'
import Navbar from '@/components/Navbar'
import { notFound } from 'next/navigation'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'
import type { Metadata } from 'next'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import EventDetailsClient from './EventDetailsClient'

export const runtime = 'nodejs'
export const revalidate = 300 // Cache for 5 minutes

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  
  let event: any = null
  
  if (isDemoMode()) {
    event = DEMO_EVENTS.find(e => e.id === id)
  } else {
    event = await getEventById(id)
  }

  if (!event) {
    return {
      title: 'Event Not Found',
    }
  }

  const eventDate = new Date(event.start_datetime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return {
    title: `${event.title} | EventHaiti`,
    description: event.description || `Join us for ${event.title} at ${event.venue_name}, ${event.city}`,
    openGraph: {
      title: event.title,
      description: event.description || `Join us for ${event.title}`,
      images: event.banner_image_url ? [event.banner_image_url] : [],
      type: 'website',
      siteName: 'EventHaiti',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description: event.description || `Join us for ${event.title}`,
      images: event.banner_image_url ? [event.banner_image_url] : [],
    },
  }
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  const { id } = await params
  
  let event: any = null
  
  if (isDemoMode()) {
    // Find demo event by ID
    event = DEMO_EVENTS.find(e => e.id === id)
    
    if (!event) {
      notFound()
    }
    
    // Add mock organizer info for demo events
    event = {
      ...event,
      users: {
        full_name: 'Demo Organizer',
        is_verified: true
      }
    }
  } else {
    // Fetch from Firestore
    const eventData = await getEventById(id)

    console.log('Event query result:', { eventData, id })

    if (!eventData) {
      console.log('Event not found, returning 404')
      notFound()
    }

    if (eventData.status !== 'published' && eventData.organizer_id !== user?.id) {
      console.log('Event not published and user is not organizer, returning 404')
      notFound()
    }

    // Get the organizer data
    const organizerDoc = await adminDb.collection('users').doc(eventData.organizer_id).get()
    const organizerData = organizerDoc.exists ? organizerDoc.data() : null

    console.log('Organizer query result:', { organizerData, organizerId: eventData.organizer_id })

    // Combine event and organizer data
    event = {
      ...eventData,
      users: organizerData ? {
        full_name: organizerData.full_name || 'Event Organizer',
        is_verified: organizerData.is_verified ?? false
      } : {
        full_name: 'Event Organizer',
        is_verified: false
      }
    }
    
    // Fetch ticket tiers to calculate accurate total capacity
    const tiersSnapshot = await adminDb.collection('ticket_tiers')
      .where('event_id', '==', id)
      .get()
    
    const totalFromTiers = tiersSnapshot.docs.reduce((sum: number, doc: any) => {
      const data = doc.data()
      return sum + (data.quantity || 0)
    }, 0)
    
    event.total_tickets = totalFromTiers || event.total_tickets || 0
  }

  const remainingTickets = (event.total_tickets || 0) - (event.tickets_sold || 0)
  const isSoldOut = remainingTickets <= 0 && (event.total_tickets || 0) > 0
  const isFree = !event.ticket_price || event.ticket_price === 0
  
  // Premium badge logic
  const isVIP = (event.ticket_price || 0) > 100
  const isTrending = (event.tickets_sold || 0) > 10
  const selloutSoon = !isSoldOut && remainingTickets < 10

  // Fetch reviews for this event
  let reviews: any[] = []
  if (!isDemoMode()) {
    const reviewsSnapshot = await adminDb.collection('reviews')
      .where('event_id', '==', id)
      .get()
    
    reviews = await Promise.all(reviewsSnapshot.docs.map(async (reviewDoc: any) => {
      const reviewData = reviewDoc.data()
      const userDoc = await adminDb.collection('users').doc(reviewData.user_id).get()
      const userData = userDoc.exists ? userDoc.data() : null
      
      return {
        id: reviewDoc.id,
        rating: reviewData.rating,
        comment: reviewData.comment,
        created_at: reviewData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        user: {
          full_name: userData?.full_name || 'Anonymous'
        }
      }
    }))
  }
  
  // Fetch related events (same category, exclude current event)
  let relatedEvents: any[] = []
  if (!isDemoMode()) {
    const now = new Date()
    const relatedSnapshot = await adminDb.collection('events')
      .where('category', '==', event.category)
      .where('is_published', '==', true)
      .where('start_datetime', '>=', now)
      .limit(4) // Get 4 to exclude current if needed
      .get()
    
    relatedEvents = await Promise.all(
      relatedSnapshot.docs
        .filter((doc: any) => doc.id !== id) // Exclude current event
        .slice(0, 3) // Limit to 3
        .map(async (doc: any) => {
          const data = doc.data()
          const organizerDoc = await adminDb.collection('users').doc(data.organizer_id).get()
          const organizerData = organizerDoc.exists ? organizerDoc.data() : null
          
          return {
            id: doc.id,
            title: data.title,
            description: data.description,
            category: data.category,
            venue_name: data.venue_name,
            city: data.city,
            commune: data.commune,
            address: data.address,
            start_datetime: data.start_datetime?.toDate?.()?.toISOString() || data.start_datetime,
            end_datetime: data.end_datetime?.toDate?.()?.toISOString() || data.end_datetime,
            ticket_price: data.ticket_price,
            total_tickets: data.total_tickets,
            tickets_sold: data.tickets_sold,
            banner_image_url: data.banner_image_url || data.image_url,
            image_url: data.image_url,
            currency: data.currency || 'HTG',
            organizer_id: data.organizer_id,
            is_published: data.is_published,
            users: organizerData ? {
              full_name: organizerData.full_name || 'Event Organizer',
              is_verified: organizerData.is_verified ?? false
            } : {
              full_name: 'Event Organizer',
              is_verified: false
            }
          }
        })
    )
  } else {
    // Use demo events for related section
    relatedEvents = DEMO_EVENTS.filter(e => e.category === event.category && e.id !== id).slice(0, 3)
  }

  // Check if user is following this organizer
  let isFollowing = false
  if (!isDemoMode() && user && event.organizer_id) {
    isFollowing = await checkIsFollowing(user.id, event.organizer_id)
  }

  // Check if user has favorited this event
  let isFavorite = false
  if (!isDemoMode() && user) {
    isFavorite = await checkIsFavorite(user.id, id)
  }

  // Serialize all data before passing to client component
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

  const serializedEvent = serializeData(event)
  const serializedRelatedEvents = serializeData(relatedEvents)

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav md:pb-8">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />
      <EventDetailsClient 
        event={serializedEvent}
        user={user}
        isFavorite={isFavorite}
        isFollowing={isFollowing}
        relatedEvents={serializedRelatedEvents}
      />
      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
