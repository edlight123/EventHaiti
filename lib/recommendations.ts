import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'

interface RecommendationScore {
  eventId: string
  score: number
  reasons: string[]
}

/**
 * Generate personalized event recommendations based on:
 * - User's favorite categories
 * - Events from followed organizers
 * - Similar events to those attended
 * - Popular events in user's city
 */
export async function getPersonalizedRecommendations(userId: string, limit: number = 10) {
  const supabase = await createClient()
  const scores = new Map<string, RecommendationScore>()

  // Get all upcoming events
  const now = new Date().toISOString()
  const { data: allEvents } = await supabase
    .from('events')
    .select('*')
    .eq('is_published', true)
    .gte('start_datetime', now)

  if (!allEvents || allEvents.length === 0) return []

  // Get user's ticket history
  const { data: userTickets } = await supabase
    .from('tickets')
    .select('event_id')
    .eq('attendee_id', userId)

  const attendedEventIds = new Set(userTickets?.map((t: any) => t.event_id) || [])

  // Get attended events details
  const { data: attendedEvents } = await supabase
    .from('events')
    .select('*')
    .in('id', Array.from(attendedEventIds))

  // Calculate category preferences
  const categoryPreferences = new Map<string, number>()
  attendedEvents?.forEach((event: any) => {
    const count = categoryPreferences.get(event.category) || 0
    categoryPreferences.set(event.category, count + 1)
  })

  // Get user's favorites
  const { data: favorites } = await supabase
    .from('event_favorites')
    .select('event_id')
    .eq('user_id', userId)

  const favoriteEventIds = new Set(favorites?.map((f: any) => f.event_id) || [])

  // Get events from favorites to learn preferences
  const { data: favoriteEvents } = await supabase
    .from('events')
    .select('*')
    .in('id', Array.from(favoriteEventIds))

  favoriteEvents?.forEach((event: any) => {
    const count = categoryPreferences.get(event.category) || 0
    categoryPreferences.set(event.category, count + 2) // Weight favorites more
  })

  // Get followed organizers
  const { data: follows } = await supabase
    .from('organizer_follows')
    .select('organizer_id')
    .eq('follower_id', userId)

  const followedOrganizerIds = new Set(follows?.map((f: any) => f.organizer_id) || [])

  // Score each event
  allEvents.forEach((event: any) => {
    // Skip already attended events
    if (attendedEventIds.has(event.id)) return

    const reasons: string[] = []
    let score = 0

    // Category match (based on history)
    const categoryScore = categoryPreferences.get(event.category) || 0
    if (categoryScore > 0) {
      score += categoryScore * 10
      reasons.push(`You've enjoyed ${event.category} events`)
    }

    // Followed organizer
    if (followedOrganizerIds.has(event.organizer_id)) {
      score += 50
      reasons.push('From an organizer you follow')
    }

    // Popular events (high ticket sales)
    const popularity = (event.tickets_sold || 0) / (event.total_tickets || 1)
    if (popularity > 0.5) {
      score += 20
      reasons.push('Popular event - selling fast!')
    }

    // Price similarity to attended events
    const avgAttendedPrice = attendedEvents && attendedEvents.length > 0
      ? attendedEvents.reduce((sum: number, e: any) => sum + (e.ticket_price || 0), 0) / attendedEvents.length
      : 0

    if (avgAttendedPrice > 0) {
      const priceDiff = Math.abs((event.ticket_price || 0) - avgAttendedPrice)
      if (priceDiff < avgAttendedPrice * 0.3) {
        score += 15
        reasons.push('Similar price range to events you like')
      }
    }

    // Upcoming soon (within 2 weeks)
    const eventDate = new Date(event.start_datetime)
    const daysUntil = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (daysUntil <= 14) {
      score += 10
      reasons.push('Coming soon!')
    }

    if (score > 0) {
      scores.set(event.id, { eventId: event.id, score, reasons })
    }
  })

  // Sort by score and get top recommendations
  const recommendations = Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  // Get full event details
  const recommendedEventIds = recommendations.map((r: any) => r.eventId)
  const { data: recommendedEvents } = await supabase
    .from('events')
    .select('*')
    .in('id', recommendedEventIds)

  // Attach recommendation reasons
  return recommendedEvents?.map((event: any) => ({
    ...event,
    recommendationReasons: scores.get(event.id)?.reasons || []
  })) || []
}

/**
 * Get trending events based on:
 * - Recent ticket sales velocity
 * - Social engagement (favorites, reviews)
 * - Recency of creation
 */
export async function getTrendingEvents(limit: number = 10) {
  const supabase = await createClient()
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Get upcoming events
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('is_published', true)
    .gte('start_datetime', now.toISOString())

  if (!events || events.length === 0) return []

  // Get recent ticket sales
  const { data: recentTickets } = await supabase
    .from('tickets')
    .select('event_id, purchased_at')
    .gte('purchased_at', weekAgo.toISOString())

  const ticketCounts = new Map<string, number>()
  recentTickets?.forEach((ticket: any) => {
    const count = ticketCounts.get(ticket.event_id) || 0
    ticketCounts.set(ticket.event_id, count + 1)
  })

  // Get favorites count
  const { data: favorites } = await supabase
    .from('event_favorites')
    .select('event_id')

  const favoriteCounts = new Map<string, number>()
  favorites?.forEach((fav: any) => {
    const count = favoriteCounts.get(fav.event_id) || 0
    favoriteCounts.set(fav.event_id, count + 1)
  })

  // Calculate trending score
  const trendingScores = events.map((event: any) => {
    const recentSales = ticketCounts.get(event.id) || 0
    const favoriteCount = favoriteCounts.get(event.id) || 0
    const daysOld = (now.getTime() - new Date(event.created_at).getTime()) / (1000 * 60 * 60 * 24)
    
    // Trending score: recent sales + favorites, with recency boost
    const recencyMultiplier = Math.max(1, 8 - daysOld) // Boost newer events
    const score = (recentSales * 2 + favoriteCount) * recencyMultiplier

    return { ...event, trendingScore: score }
  })

  // Sort by trending score
  return trendingScores
    .sort((a: any, b: any) => b.trendingScore - a.trendingScore)
    .slice(0, limit)
}

/**
 * Get events near a specific location
 * Matches by city OR commune to handle cases like Pétion-Ville
 */
export async function getNearbyEvents(city: string, limit: number = 10) {
  const supabase = await createClient()
  const now = new Date().toISOString()

  // First, get all upcoming published events
  const { data: allEvents } = await supabase
    .from('events')
    .select('*')
    .eq('is_published', true)
    .gte('start_datetime', now)
    .order('start_datetime', { ascending: true })

  if (!allEvents) return []

  // Filter in memory to match city OR commune (since we can't use OR queries in Firebase wrapper)
  const nearbyEvents = allEvents.filter((event: any) => 
    event.city === city || event.commune === city || 
    event.city?.includes(city) || event.commune?.includes(city)
  )

  return nearbyEvents.slice(0, limit)
}

/**
 * Get related events based on category and organizer
 */
export async function getRelatedEvents(eventId: string, limit: number = 6) {
  const supabase = await createClient()

  // Get the reference event
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (!event) return []

  const now = new Date().toISOString()

  // Get events from same category or same organizer
  const { data: relatedEvents } = await supabase
    .from('events')
    .select('*')
    .eq('is_published', true)
    .gte('start_datetime', now)
    .neq('id', eventId)

  if (!relatedEvents) return []

  // Score related events
  const scoredEvents = relatedEvents.map((e: any) => {
    let score = 0
    if (e.category === event.category) score += 10
    if (e.organizer_id === event.organizer_id) score += 20
    if (e.city === event.city) score += 5
    
    // Price similarity
    const priceDiff = Math.abs((e.ticket_price || 0) - (event.ticket_price || 0))
    if (priceDiff < (event.ticket_price || 0) * 0.3) score += 5

    return { ...e, relatedScore: score }
  })

  return scoredEvents
    .filter((e: any) => e.relatedScore > 0)
    .sort((a: any, b: any) => b.relatedScore - a.relatedScore)
    .slice(0, limit)
}
