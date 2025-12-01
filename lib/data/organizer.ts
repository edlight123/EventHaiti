/**
 * Organizer Data Layer
 * 
 * Centralized data access for organizer-specific operations with proper optimization.
 */

import { adminDb } from '@/lib/firebase/admin'
import { getEventTicketCounts } from './tickets'

export interface OrganizerDashboardStats {
  totalEvents: number
  publishedEvents: number
  draftEvents: number
  totalTicketsSold: number
  totalRevenue: number
  upcomingEvents: number
}

export interface EventStats {
  eventId: string
  ticketsSold: number
  checkedIn: number
  revenue: number
  capacity?: number
}

// ============================================================================
// SERVER-SIDE FUNCTIONS (use adminDb)
// ============================================================================

/**
 * Get organizer dashboard stats (server-side)
 * Optimized with parallel queries and aggregation
 */
export async function getOrganizerDashboardStats(organizerId: string): Promise<OrganizerDashboardStats> {
  try {
    const now = new Date()

    // Run all queries in parallel
    const [
      totalEventsSnap,
      publishedEventsSnap,
      draftEventsSnap,
      upcomingEventsSnap,
      allEventsSnap
    ] = await Promise.all([
      adminDb.collection('events')
        .where('organizer_id', '==', organizerId)
        .count()
        .get(),
      adminDb.collection('events')
        .where('organizer_id', '==', organizerId)
        .where('status', '==', 'published')
        .count()
        .get(),
      adminDb.collection('events')
        .where('organizer_id', '==', organizerId)
        .where('status', '==', 'draft')
        .count()
        .get(),
      adminDb.collection('events')
        .where('organizer_id', '==', organizerId)
        .where('status', '==', 'published')
        .where('start_datetime', '>=', now)
        .count()
        .get(),
      // Get all events for this organizer to calculate ticket stats
      adminDb.collection('events')
        .where('organizer_id', '==', organizerId)
        .select('id') // Only fetch IDs to minimize data transfer
        .get()
    ])

    const eventIds = allEventsSnap.docs.map((doc: any) => doc.id)
    
    // Get ticket stats for all events in batches
    let totalTicketsSold = 0
    let totalRevenue = 0

    if (eventIds.length > 0) {
      // Process in batches of 10 (Firestore 'in' query limit)
      for (let i = 0; i < eventIds.length; i += 10) {
        const batch = eventIds.slice(i, i + 10)
        
        const ticketsSnap = await adminDb.collection('tickets')
          .where('event_id', 'in', batch)
          .where('status', '==', 'confirmed')
          .select('price_paid') // Only fetch price_paid field
          .get()

        totalTicketsSold += ticketsSnap.size
        ticketsSnap.docs.forEach((doc: any) => {
          const data = doc.data()
          totalRevenue += data.price_paid || 0
        })
      }
    }

    return {
      totalEvents: totalEventsSnap.data().count,
      publishedEvents: publishedEventsSnap.data().count,
      draftEvents: draftEventsSnap.data().count,
      upcomingEvents: upcomingEventsSnap.data().count,
      totalTicketsSold,
      totalRevenue,
    }
  } catch (error) {
    console.error('Error getting organizer dashboard stats:', error)
    return {
      totalEvents: 0,
      publishedEvents: 0,
      draftEvents: 0,
      upcomingEvents: 0,
      totalTicketsSold: 0,
      totalRevenue: 0,
    }
  }
}

/**
 * Get stats for a specific event (server-side)
 * Uses aggregation for ticket counts
 */
export async function getEventStats(eventId: string): Promise<EventStats> {
  try {
    const [ticketCounts, eventDoc] = await Promise.all([
      getEventTicketCounts(eventId),
      adminDb.collection('events').doc(eventId).get()
    ])

    // Calculate revenue
    const ticketsSnap = await adminDb.collection('tickets')
      .where('event_id', '==', eventId)
      .where('status', '==', 'confirmed')
      .select('price_paid')
      .get()

    let revenue = 0
    ticketsSnap.docs.forEach((doc: any) => {
      const data = doc.data()
      revenue += data.price_paid || 0
    })

    const eventData = eventDoc.data()

    return {
      eventId,
      ticketsSold: ticketCounts.confirmed,
      checkedIn: ticketCounts.checkedIn,
      revenue,
      capacity: eventData?.capacity,
    }
  } catch (error) {
    console.error('Error getting event stats:', error)
    return {
      eventId,
      ticketsSold: 0,
      checkedIn: 0,
      revenue: 0,
    }
  }
}

/**
 * Get revenue breakdown by event for organizer (server-side)
 */
export async function getOrganizerRevenueByEvent(
  organizerId: string,
  limit?: number
): Promise<Array<{ eventId: string; eventTitle: string; revenue: number; ticketsSold: number }>> {
  try {
    let queryRef = adminDb.collection('events')
      .where('organizer_id', '==', organizerId)
      .where('status', '==', 'published')
      .orderBy('created_at', 'desc')

    if (limit) {
      queryRef = queryRef.limit(limit) as any
    }

    const eventsSnap = await queryRef.get()
    
    const revenueData = await Promise.all(
      eventsSnap.docs.map(async (eventDoc: any) => {
        const eventData = eventDoc.data()
        
        const ticketsSnap = await adminDb.collection('tickets')
          .where('event_id', '==', eventDoc.id)
          .where('status', '==', 'confirmed')
          .select('price_paid')
          .get()

        let revenue = 0
        ticketsSnap.docs.forEach((doc: any) => {
          const data = doc.data()
          revenue += data.price_paid || 0
        })

        return {
          eventId: eventDoc.id,
          eventTitle: eventData.title || 'Untitled Event',
          revenue,
          ticketsSold: ticketsSnap.size,
        }
      })
    )

    // Sort by revenue descending
    return revenueData.sort((a, b) => b.revenue - a.revenue)
  } catch (error) {
    console.error('Error getting organizer revenue by event:', error)
    return []
  }
}
