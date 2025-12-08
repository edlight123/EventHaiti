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
  // Get pending verifications manually since we need OR logic
  const verificationsSnapshot = await adminDb
    .collection('verification_requests')
    .get()
  
  const pendingVerifications = verificationsSnapshot.docs.filter((doc: any) => {
    const status = doc.data().status
    return status === 'pending' || status === 'in_review'
  }).length

  const [usersCount, eventsCount, ticketsCount] = await Promise.all([
    getCollectionCount('users'),
    getCollectionCount('events'),
    getCollectionCount('tickets')
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
 * Returns GMV, tickets sold, and refunds for the last 7 days
 */
export async function get7DayMetrics(): Promise<{ 
  gmv7d: number
  tickets7d: number
  refunds7d: number
  refundsAmount7d: number
}> {
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
    let refunds7d = 0
    let refundsAmount7d = 0
    
    statsDocs.forEach(doc => {
      if (doc.exists) {
        const data = doc.data()
        gmv7d += data?.gmvConfirmed || 0
        tickets7d += data?.ticketsConfirmed || 0
        refunds7d += data?.refundsCount || 0
        refundsAmount7d += data?.refundsAmount || 0
      }
    })

    return { gmv7d, tickets7d, refunds7d, refundsAmount7d }
  } catch (error) {
    console.error('Error fetching 7-day metrics:', error)
    // If rollups don't exist yet, return 0
    return { gmv7d: 0, tickets7d: 0, refunds7d: 0, refundsAmount7d: 0 }
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
      
      // Safe date conversion helper
      const toISOSafe = (dateValue: any): string => {
        try {
          if (!dateValue) return new Date().toISOString()
          if (dateValue.toDate) return dateValue.toDate().toISOString()
          if (typeof dateValue === 'string') return new Date(dateValue).toISOString()
          if (dateValue instanceof Date) return dateValue.toISOString()
          return new Date().toISOString()
        } catch (error) {
          console.error('Date conversion error:', error, dateValue)
          return new Date().toISOString()
        }
      }
      
      return {
        id: doc.id,
        title: data.title || 'Untitled Event',
        startDateTime: toISOSafe(data.startDateTime || data.start_datetime),
        ticketPrice: data.ticketPrice || data.ticket_price || data.price || 0,
        currency: data.currency || 'HTG',
        createdAt: toISOSafe(data.createdAt || data.created_at),
        isPublished: data.isPublished ?? data.is_published ?? data.status === 'published',
        city: data.city || '',
        commune: data.commune || '',
        venueName: data.venueName || data.venue_name || data.address || '',
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
    // Get all verification requests and filter in memory since Firestore doesn't support OR in where
    const verificationsSnapshot = await adminDb
      .collection('verification_requests')
      .get()

    const pendingDocs = verificationsSnapshot.docs
      .filter((doc: any) => {
        const status = doc.data().status
        return status === 'pending' || status === 'in_review'
      })
      .sort((a: any, b: any) => {
        const aDate = a.data().created_at?.toDate?.() || a.data().createdAt?.toDate?.() || new Date(0)
        const bDate = b.data().created_at?.toDate?.() || b.data().createdAt?.toDate?.() || new Date(0)
        return bDate.getTime() - aDate.getTime()
      })
      .slice(0, limit)

    return pendingDocs.map((doc: any) => {
      const data = doc.data()
      
      // Handle both old and new formats for timestamps
      let createdAt
      if (data.submittedAt?._seconds) {
        createdAt = new Date(data.submittedAt._seconds * 1000).toISOString()
      } else if (data.createdAt?._seconds) {
        createdAt = new Date(data.createdAt._seconds * 1000).toISOString()
      } else if (data.createdAt?.toDate) {
        createdAt = data.createdAt.toDate().toISOString()
      } else if (data.created_at?.toDate) {
        createdAt = data.created_at.toDate().toISOString()
      } else {
        createdAt = new Date(data.created_at || data.createdAt || Date.now()).toISOString()
      }
      
      // Extract business name from nested format or direct field
      const businessName = data.businessName 
        || data.business_name 
        || data.steps?.organizerInfo?.fields?.organization_name
        || data.steps?.organizerInfo?.fields?.full_name
      
      return {
        id: doc.id,
        userId: data.userId || data.user_id || doc.id,
        businessName,
        status: data.status,
        createdAt,
        idType: data.idType || data.id_type || 'Government ID'
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
      .map((doc: any) => {
        const data = doc.data()
        const startDateTime = data.startDateTime || data.start_datetime
        return {
          id: doc.id,
          title: data.title,
          startDateTime: startDateTime?.toDate ? startDateTime.toDate().toISOString() : startDateTime,
          ticketPrice: data.ticketPrice || data.ticket_price || data.price,
          currency: data.currency,
          city: data.city,
          commune: data.commune,
          venueName: data.venueName || data.venue_name,
          status: data.status,
          isPublished: data.isPublished ?? data.is_published
        }
      })
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
      .map((doc: any) => {
        const data = doc.data()
        return {
          id: doc.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          is_verified: data.is_verified
        }
      })
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
