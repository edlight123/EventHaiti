import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
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
    const supabase = await createClient()
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()
    event = data
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
    // Fetch from database
    const supabase = await createClient()
    
    // First get the event
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    console.log('Event query result:', { eventData, eventError, id })

    if (!eventData) {
      console.log('Event not found, returning 404')
      notFound()
    }

    if (!eventData.is_published && eventData.organizer_id !== user?.id) {
      console.log('Event not published and user is not organizer, returning 404')
      notFound()
    }

    // Then get the organizer data separately
    const { data: organizerData, error: organizerError } = await supabase
      .from('users')
      .select('full_name, is_verified')
      .eq('id', eventData.organizer_id)
      .single()

    console.log('Organizer query result:', { organizerData, organizerError, organizerId: eventData.organizer_id })

    // Handle case where organizer data might not exist
    // Explicitly serialize all fields to prevent Timestamp leakage
    event = {
      id: eventData.id,
      title: eventData.title,
      description: eventData.description,
      category: eventData.category,
      venue_name: eventData.venue_name,
      city: eventData.city,
      commune: eventData.commune,
      address: eventData.address,
      start_datetime: eventData.start_datetime,
      end_datetime: eventData.end_datetime,
      ticket_price: eventData.ticket_price,
      total_tickets: eventData.total_tickets,
      tickets_sold: eventData.tickets_sold,
      banner_image_url: eventData.banner_image_url,
      is_published: eventData.is_published,
      organizer_id: eventData.organizer_id,
      created_at: eventData.created_at,
      updated_at: eventData.updated_at,
      users: organizerData || {
        full_name: 'Event Organizer',
        is_verified: false
      }
    }
    
    // Fetch ticket tiers to calculate accurate total capacity
    const { data: tiersData } = await supabase
      .from('ticket_tiers')
      .select('quantity')
      .eq('event_id', id)
    
    const totalFromTiers = tiersData?.reduce((sum: number, tier: any) => sum + (tier.quantity || 0), 0) || 0
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
    const supabase = await createClient()
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*, users!reviews_user_id_fkey(full_name)')
      .eq('event_id', id)
    
    reviews = reviewsData?.map((r: any) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: typeof r.created_at === 'string' ? r.created_at : r.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      user: {
        full_name: r.users?.full_name || 'Anonymous'
      }
    })) || []
  }
  
  // Fetch related events (same category, exclude current event)
  let relatedEvents: any[] = []
  if (!isDemoMode()) {
    const supabase = await createClient()
    const now = new Date().toISOString()
    const { data: relatedData } = await supabase
      .from('events')
      .select('*, users!events_organizer_id_fkey(full_name, is_verified)')
      .eq('category', event.category)
      .eq('is_published', true)
      .gte('start_datetime', now)
      .neq('id', id)
      .limit(3)
    
    relatedEvents = relatedData || []
  } else {
    // Use demo events for related section
    relatedEvents = DEMO_EVENTS.filter(e => e.category === event.category && e.id !== id).slice(0, 3)
  }

  // Check if user is following this organizer
  let isFollowing = false
  if (!isDemoMode() && user && event.organizer_id) {
    const supabase = await createClient()
    const { data: followData } = await supabase
      .from('organizer_follows')
      .select('id')
      .eq('organizer_id', event.organizer_id)
      .eq('user_id', user.id)
      .single()
    
    isFollowing = !!followData
  }

  // Check if user has favorited this event
  let isFavorite = false
  if (!isDemoMode() && user) {
    const supabase = await createClient()
    const { data: favoriteData } = await supabase
      .from('event_favorites')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .single()
    
    isFavorite = !!favoriteData
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav md:pb-8">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />
      <EventDetailsClient 
        event={event}
        user={user}
        isFavorite={isFavorite}
        isFollowing={isFollowing}
        relatedEvents={relatedEvents}
      />
      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
