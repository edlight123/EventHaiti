/**
 * Firestore Admin Helper
 * Server-side Firestore utilities for admin operations
 */

import { adminDb } from '@/lib/firebase/admin'
import { FieldPath } from 'firebase-admin/firestore'

/**
 * Get aggregate count for a collection
 */
export async function getCollectionCount(collectionName: string, whereClause?: { field: string; op: any; value: any }): Promise<number> {
  try {
    let query = adminDb.collection(collectionName)
    
    if (whereClause) {
      query = query.where(whereClause.field, whereClause.op, whereClause.value) as any
    }
    
    const aggregateQuery = query.count()
    const snapshot = await aggregateQuery.get()
    return snapshot.data().count || 0
  } catch (error) {
    console.error(`Error getting count for ${collectionName}:`, error)
    // If collection doesn't exist or error occurs, return 0
    return 0
  }
}

/**
 * Get platform stats counts
 */
export async function getPlatformCounts() {
  const [usersCount, eventsCount, ticketsCount, pendingVerifications] = await Promise.all([
    getCollectionCount('users'),
    getCollectionCount('events'),
    getCollectionCount('tickets'),
    getCollectionCount('verification_requests', { field: 'status', op: '==', value: 'pending' })
  ])

  return {
    usersCount,
    eventsCount,
    ticketsCount,
    pendingVerifications
  }
}

/**
 * Get 7-day metrics from daily rollups
 * Returns GMV and tickets sold for the last 7 days
 */
export async function get7DayMetrics(): Promise<{ gmv7d: number; tickets7d: number }> {
  try {
    const today = new Date()
    const dates: string[] = []
    
    // Generate last 7 days in YYYY-MM-DD format
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      dates.push(dateStr)
    }

    // Fetch all 7 days in parallel
    const statsPromises = dates.map(date => 
      adminDb.collection('platform_stats_daily').doc(date).get()
    )
    
    const statsDocs = await Promise.all(statsPromises)
    
    let gmv7d = 0
    let tickets7d = 0
    
    statsDocs.forEach(doc => {
      if (doc.exists) {
        const data = doc.data()
        gmv7d += data?.gmvConfirmed || 0
        tickets7d += data?.ticketsConfirmed || 0
      }
    })

    return { gmv7d, tickets7d }
  } catch (error) {
    console.error('Error fetching 7-day metrics:', error)
    // If rollups don't exist yet, return 0
    return { gmv7d: 0, tickets7d: 0 }
  }
}

/**
 * Get recent events ordered by createdAt
 */
export async function getRecentEvents(limit: number = 8) {
  try {
    // Try createdAt first (camelCase), fall back to created_at (snake_case)
    let eventsSnapshot
    try {
      eventsSnapshot = await adminDb
        .collection('events')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get()
    } catch (error) {
      // If createdAt doesn't exist, try created_at
      console.log('Trying created_at field instead of createdAt')
      eventsSnapshot = await adminDb
        .collection('events')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .get()
    }

    return eventsSnapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title,
        startDateTime: data.startDateTime?.toDate?.() || data.start_datetime?.toDate?.() || new Date(data.start_datetime || data.startDateTime),
        ticketPrice: data.ticketPrice || data.ticket_price || data.price || 0,
        createdAt: data.createdAt?.toDate?.() || data.created_at?.toDate?.() || new Date(data.created_at || data.createdAt || Date.now()),
        isPublished: data.isPublished ?? data.is_published ?? data.status === 'published',
        city: data.city || data.commune || '',
        venueName: data.venueName || data.venue_name || '',
        organizerId: data.organizerId || data.organizer_id
      }
    })
  } catch (error) {
    console.error('Error fetching recent events:', error)
    return []
  }
}

/**
 * Get pending verification requests (top N)
 */
export async function getPendingVerifications(limit: number = 3) {
  try {
    // Try createdAt first, fall back to created_at
    let verificationsSnapshot
    try {
      verificationsSnapshot = await adminDb
        .collection('verification_requests')
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get()
    } catch (error) {
      console.log('Trying created_at field instead of createdAt for verifications')
      verificationsSnapshot = await adminDb
        .collection('verification_requests')
        .where('status', '==', 'pending')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .get()
    }

    return verificationsSnapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        userId: data.userId || data.user_id,
        businessName: data.businessName || data.business_name,
        status: data.status,
        createdAt: data.createdAt?.toDate?.() || data.created_at?.toDate?.() || new Date(data.created_at || data.createdAt || Date.now()),
        idType: data.idType || data.id_type
      }
    })
  } catch (error) {
    console.error('Error fetching pending verifications:', error)
    return []
  }
}

/**
 * Search across events, users, and orders
 */
export async function globalSearch(query: string) {
  if (!query || query.trim().length < 2) {
    return { events: [], users: [], orders: [] }
  }

  const searchTerm = query.toLowerCase().trim()

  try {
    // Search events by title
    const eventsSnapshot = await adminDb
      .collection('events')
      .orderBy('title')
      .limit(10)
      .get()

    const events = eventsSnapshot.docs
      .map((doc: any) => ({ id: doc.id, ...doc.data() }))
      .filter((event: any) => 
        event.title?.toLowerCase().includes(searchTerm)
      )
      .slice(0, 5)

    // Search users by email (limited for privacy)
    const usersSnapshot = await adminDb
      .collection('users')
      .orderBy('email')
      .limit(10)
      .get()

    const users = usersSnapshot.docs
      .map((doc: any) => ({ id: doc.id, ...doc.data() }))
      .filter((user: any) => 
        user.email?.toLowerCase().includes(searchTerm)
      )
      .slice(0, 5)

    return { events, users, orders: [] }
  } catch (error) {
    console.error('Error in global search:', error)
    return { events: [], users: [], orders: [] }
  }
}
