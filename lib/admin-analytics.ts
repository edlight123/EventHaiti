/**
 * Enhanced admin analytics and platform insights
 */

import { createClient } from '@/lib/firebase-db/server'

/**
 * Get user growth metrics
 */
export async function getUserGrowthMetrics(days: number = 30) {
  const supabase = await createClient()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: users } = await supabase
    .from('users')
    .select('created_at, role')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  if (!users || users.length === 0) {
    return { dailySignups: [], totalUsers: 0, organizerCount: 0, attendeeCount: 0 }
  }

  // Group by day
  const dailySignups: Record<string, { date: string; attendees: number; organizers: number; total: number }> = {}

  users.forEach((user: any) => {
    const date = new Date(user.created_at).toISOString().split('T')[0]
    if (!dailySignups[date]) {
      dailySignups[date] = { date, attendees: 0, organizers: 0, total: 0 }
    }
    if (user.role === 'organizer') {
      dailySignups[date].organizers++
    } else {
      dailySignups[date].attendees++
    }
    dailySignups[date].total++
  })

  const organizerCount = users.filter((u: any) => u.role === 'organizer').length
  const attendeeCount = users.filter((u: any) => u.role === 'attendee').length

  return {
    dailySignups: Object.values(dailySignups),
    totalUsers: users.length,
    organizerCount,
    attendeeCount,
  }
}

/**
 * Get revenue growth metrics
 */
export async function getRevenueGrowthMetrics(days: number = 30) {
  const supabase = await createClient()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: tickets } = await supabase
    .from('tickets')
    .select('purchased_at, price, payment_method')
    .gte('purchased_at', startDate.toISOString())
    .order('purchased_at', { ascending: true })

  if (!tickets || tickets.length === 0) {
    return { dailyRevenue: [], totalRevenue: 0, stripeRevenue: 0, monCashRevenue: 0 }
  }

  // Group by day
  const dailyRevenue: Record<string, { date: string; stripe: number; moncash: number; total: number }> = {}

  let totalRevenue = 0
  let stripeRevenue = 0
  let monCashRevenue = 0

  tickets.forEach((ticket: any) => {
    const date = new Date(ticket.purchased_at).toISOString().split('T')[0]
    const price = ticket.price || 0

    if (!dailyRevenue[date]) {
      dailyRevenue[date] = { date, stripe: 0, moncash: 0, total: 0 }
    }

    if (ticket.payment_method === 'stripe') {
      dailyRevenue[date].stripe += price
      stripeRevenue += price
    } else if (ticket.payment_method === 'moncash') {
      dailyRevenue[date].moncash += price
      monCashRevenue += price
    }

    dailyRevenue[date].total += price
    totalRevenue += price
  })

  return {
    dailyRevenue: Object.values(dailyRevenue),
    totalRevenue,
    stripeRevenue,
    monCashRevenue,
  }
}

/**
 * Calculate event success score (0-100)
 * Based on: ticket sales %, reviews, favorites, recency
 */
export async function calculateEventSuccessScore(eventId: string): Promise<number> {
  const supabase = await createClient()
  const { data: event } = await supabase
    .from('events')
    .select('*, tickets(count), event_favorites(count), event_reviews(rating)')
    .eq('id', eventId)
    .single()

  if (!event) return 0

  let score = 0

  // 1. Ticket sales percentage (40 points max)
  const ticketsSold = event.tickets?.length || 0
  const capacity = event.capacity || 1
  const salesPercentage = Math.min((ticketsSold / capacity) * 100, 100)
  score += (salesPercentage / 100) * 40

  // 2. Average review rating (30 points max)
  const reviews = event.event_reviews || []
  if (reviews.length > 0) {
    const avgRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
    score += (avgRating / 5) * 30
  }

  // 3. Favorites count (20 points max)
  const favoritesCount = event.event_favorites?.length || 0
  const favoritesScore = Math.min(favoritesCount / 50, 1) // Max at 50 favorites
  score += favoritesScore * 20

  // 4. Recency bonus (10 points max)
  const daysUntilEvent = Math.floor(
    (new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  if (daysUntilEvent > 0 && daysUntilEvent <= 30) {
    score += 10 // Upcoming events get full recency bonus
  } else if (daysUntilEvent > 30 && daysUntilEvent <= 90) {
    score += 5 // Far future events get half
  }

  return Math.round(score)
}

/**
 * Get top performing events
 */
export async function getTopPerformingEvents(limit: number = 10) {
  const supabase = await createClient()
  const { data: events } = await supabase
    .from('events')
    .select('id, title, date, ticket_price, capacity, organizer_id, users(name)')
    .order('created_at', { ascending: false })
    .limit(50) // Get recent events

  if (!events) return []

  // Calculate success scores
  const eventsWithScores = await Promise.all(
    events.map(async (event: any) => {
      const score = await calculateEventSuccessScore(event.id)
      return { ...event, successScore: score }
    })
  )

  // Sort by success score
  return eventsWithScores.sort((a, b) => b.successScore - a.successScore).slice(0, limit)
}

/**
 * Get category popularity over time
 */
export async function getCategoryPopularity(days: number = 30) {
  const supabase = await createClient()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get all ticket purchases in the period
  const { data: tickets } = await supabase
    .from('tickets')
    .select('purchased_at, events(category)')
    .gte('purchased_at', startDate.toISOString())

  if (!tickets || tickets.length === 0) {
    return []
  }

  // Count by category
  const categoryCounts: Record<string, number> = {}

  tickets.forEach((ticket: any) => {
    const category = ticket.events?.category || 'Other'
    categoryCounts[category] = (categoryCounts[category] || 0) + 1
  })

  // Convert to array and sort
  return Object.entries(categoryCounts)
    .map(([category, count]: [string, number]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Get geographic distribution of users
 */
export async function getGeographicDistribution() {
  const supabase = await createClient()
  const { data: users } = await supabase
    .from('users')
    .select('phone_number')

  if (!users) return []

  // Extract area codes or regions from phone numbers
  // This is a simplified example - would need proper geocoding in production
  const regionCounts: Record<string, number> = {
    'Port-au-Prince': 0,
    'Cap-Haïtien': 0,
    'Gonaïves': 0,
    'Les Cayes': 0,
    'Jacmel': 0,
    'Other': 0,
  }

  users.forEach((user: any) => {
    if (user.phone_number) {
      // Simplified: would need real geocoding
      // Just count all as "Other" for now
      regionCounts['Other']++
    }
  })

  return Object.entries(regionCounts)
    .map(([region, count]: [string, number]) => ({ region, count }))
    .filter((r: any) => r.count > 0)
}

/**
 * Get conversion funnel metrics
 * Views → Favorites → Purchases
 */
export async function getConversionFunnelMetrics(days: number = 30) {
  const supabase = await createClient()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // This would require view tracking (not implemented yet)
  // For now, use favorites and tickets as funnel

  const { data: favorites } = await supabase
    .from('event_favorites')
    .select('id, created_at')
    .gte('created_at', startDate.toISOString())

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, purchased_at')
    .gte('purchased_at', startDate.toISOString())

  const favoritesCount = favorites?.length || 0
  const ticketsCount = tickets?.length || 0

  // Estimate views as 10x favorites (would need real tracking)
  const estimatedViews = favoritesCount * 10

  const favoriteRate = estimatedViews > 0 ? (favoritesCount / estimatedViews) * 100 : 0
  const purchaseRate = favoritesCount > 0 ? (ticketsCount / favoritesCount) * 100 : 0
  const overallConversion = estimatedViews > 0 ? (ticketsCount / estimatedViews) * 100 : 0

  return {
    views: estimatedViews,
    favorites: favoritesCount,
    purchases: ticketsCount,
    favoriteRate: Math.round(favoriteRate * 100) / 100,
    purchaseRate: Math.round(purchaseRate * 100) / 100,
    overallConversion: Math.round(overallConversion * 100) / 100,
  }
}

/**
 * Get organizer performance rankings
 */
export async function getOrganizerRankings(limit: number = 10) {
  const supabase = await createClient()
  const { data: organizers } = await supabase
    .from('users')
    .select('id, name, email, created_at')
    .eq('role', 'organizer')

  if (!organizers) return []

  // Get stats for each organizer
  const organizerStats = await Promise.all(
    organizers.map(async (organizer: any) => {
      const { data: events } = await supabase
        .from('events')
        .select('id, tickets(count), event_favorites(count), event_reviews(rating)')
        .eq('organizer_id', organizer.id)

      const eventsCount = events?.length || 0
      const totalTickets = events?.reduce((sum: number, e: any) => sum + (e.tickets?.length || 0), 0) || 0
      const totalFavorites = events?.reduce((sum: number, e: any) => sum + (e.event_favorites?.length || 0), 0) || 0

      // Calculate average review rating across all events
      let totalRating = 0
      let totalReviews = 0
      events?.forEach((event: any) => {
        const reviews = event.event_reviews || []
        reviews.forEach((review: any) => {
          totalRating += review.rating
          totalReviews++
        })
      })
      const avgRating = totalReviews > 0 ? totalRating / totalReviews : 0

      return {
        ...organizer,
        eventsCount,
        totalTickets,
        totalFavorites,
        avgRating: Math.round(avgRating * 10) / 10,
      }
    })
  )

  // Sort by total tickets sold
  return organizerStats.sort((a, b) => b.totalTickets - a.totalTickets).slice(0, limit)
}

/**
 * Get churn analysis (users who haven't purchased in X days)
 */
export async function getChurnAnalysis(inactiveDays: number = 90) {
  const supabase = await createClient()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - inactiveDays)

  // Get users who have purchased before
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, name, email, created_at')
    .eq('role', 'attendee')

  if (!allUsers) return { churned: [], active: [], churnRate: 0 }

  // Check last purchase for each user
  const userAnalysis = await Promise.all(
    allUsers.map(async (user: any) => {
      const { data: tickets } = await supabase
        .from('tickets')
        .select('purchased_at')
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false })
        .limit(1)

      const lastPurchase = tickets?.[0]?.purchased_at
      const hasEverPurchased = !!lastPurchase

      if (!hasEverPurchased) {
        return { ...user, status: 'never_purchased', lastPurchase: null }
      }

      const isChurned = new Date(lastPurchase) < cutoffDate

      return {
        ...user,
        status: isChurned ? 'churned' : 'active',
        lastPurchase,
      }
    })
  )

  const churned = userAnalysis.filter((u: any) => u.status === 'churned')
  const active = userAnalysis.filter((u: any) => u.status === 'active')
  const churnRate = allUsers.length > 0 ? (churned.length / allUsers.length) * 100 : 0

  return {
    churned,
    active,
    churnRate: Math.round(churnRate * 100) / 100,
  }
}
