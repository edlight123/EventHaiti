/**
 * Events Data Layer
 * 
 * Centralized data access for events with proper caching, pagination, and optimization.
 * Separates client-side and server-side operations.
 */

import { adminDb } from '@/lib/firebase/admin'
import { db } from '@/lib/firebase/client'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  DocumentSnapshot,
  QueryConstraint,
  getCountFromServer,
  Timestamp
} from 'firebase/firestore'
import { unstable_cache } from 'next/cache'

export interface Event {
  id: string
  title: string
  description: string
  organizer_id: string
  start_datetime: string
  end_datetime: string
  venue_name: string
  address: string
  city: string
  commune: string
  category: string
  status: 'draft' | 'published' | 'cancelled'
  capacity?: number
  ticket_price?: number
  image_url?: string
  created_at: string
  updated_at: string
  [key: string]: any
}

export interface EventFilters {
  city?: string
  category?: string
  status?: string
  search?: string
  startDate?: Date
  endDate?: Date
}

export interface PaginatedResult<T> {
  data: T[]
  lastDoc: DocumentSnapshot | null
  hasMore: boolean
  total?: number
}

// ============================================================================
// SERVER-SIDE FUNCTIONS (use adminDb)
// ============================================================================

/**
 * Get a single event by ID (server-side)
 * Cached for 60 seconds
 */
export const getEventById = unstable_cache(
  async (eventId: string): Promise<Event | null> => {
    try {
      const eventDoc = await adminDb.collection('events').doc(eventId).get()
      
      if (!eventDoc.exists) {
        return null
      }

      const data = eventDoc.data()
      return {
        id: eventDoc.id,
        organizer_id: data?.organizer_id,
        title: data?.title,
        description: data?.description,
        category: data?.category,
        venue_name: data?.venue_name,
        city: data?.city,
        commune: data?.commune,
        address: data?.address,
        status: data?.status || 'draft',
        start_datetime: data?.start_datetime?.toDate?.()?.toISOString() || data?.start_datetime,
        end_datetime: data?.end_datetime?.toDate?.()?.toISOString() || data?.end_datetime,
        capacity: data?.capacity,
        ticket_price: data?.ticket_price,
        image_url: data?.banner_image_url || data?.image_url,
        created_at: data?.created_at?.toDate?.()?.toISOString() || data?.created_at,
        updated_at: data?.updated_at?.toDate?.()?.toISOString() || data?.updated_at,
      } as Event
    } catch (error) {
      console.error('Error fetching event:', error)
      return null
    }
  },
  ['event-by-id-v2'],
  { revalidate: 60, tags: ['event'] }
)

/**
 * Get events for discover page with filters and pagination (server-side)
 * Cached for 30 seconds
 */
export const getDiscoverEvents = unstable_cache(
  async (
    filters: EventFilters = {},
    pageSize: number = 20
  ): Promise<Event[]> => {
    try {
      let queryRef = adminDb.collection('events')
        .where('is_published', '==', true)
        .orderBy('start_datetime', 'asc')

      // Apply filters
      if (filters.city) {
        queryRef = queryRef.where('city', '==', filters.city) as any
      }

      if (filters.category) {
        queryRef = queryRef.where('category', '==', filters.category) as any
      }

      if (filters.startDate) {
        queryRef = queryRef.where('start_datetime', '>=', filters.startDate) as any
      }

      queryRef = queryRef.limit(pageSize) as any

      const snapshot = await queryRef.get()
      
      let events = snapshot.docs.map((doc: any) => {
        const data = doc.data()
        return {
          id: doc.id,
          organizer_id: data.organizer_id,
          title: data.title,
          description: data.description,
          category: data.category,
          venue_name: data.venue_name,
          city: data.city,
          commune: data.commune,
          address: data.address,
          status: data.status || 'draft',
          start_datetime: data.start_datetime?.toDate?.()?.toISOString() || data.start_datetime,
          end_datetime: data.end_datetime?.toDate?.()?.toISOString() || data.end_datetime,
          capacity: data.capacity,
          ticket_price: data.ticket_price,
          image_url: data.banner_image_url || data.image_url,
          created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
          updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
        }
      })

      // Apply search filter in memory (Firestore doesn't support text search)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        events = events.filter((event: Event) =>
          event.title?.toLowerCase().includes(searchLower) ||
          event.description?.toLowerCase().includes(searchLower) ||
          event.venue_name?.toLowerCase().includes(searchLower) ||
          event.category?.toLowerCase().includes(searchLower)
        )
      }

      return events
    } catch (error) {
      console.error('Error fetching discover events:', error)
      return []
    }
  },
  ['discover-events-v2'],
  { revalidate: 30, tags: ['events', 'discover'] }
)

/**
 * Get organizer's events with pagination (server-side)
 */
export async function getOrganizerEvents(
  organizerId: string,
  pageSize: number = 20,
  lastDocument?: DocumentSnapshot
): Promise<PaginatedResult<Event>> {
  try {
    let queryRef = adminDb.collection('events')
      .where('organizer_id', '==', organizerId)
      .orderBy('created_at', 'desc')
      .limit(pageSize + 1) // Fetch one extra to check if there are more

    if (lastDocument) {
      queryRef = queryRef.startAfter(lastDocument) as any
    }

    const snapshot = await queryRef.get()
    const hasMore = snapshot.docs.length > pageSize
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs

    const events = docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        organizer_id: data.organizer_id,
        title: data.title,
        description: data.description,
        category: data.category,
        venue_name: data.venue_name,
        city: data.city,
        commune: data.commune,
        address: data.address,
        status: data.status || 'draft',
        start_datetime: data.start_datetime?.toDate?.()?.toISOString() || data.start_datetime,
        end_datetime: data.end_datetime?.toDate?.()?.toISOString() || data.end_datetime,
        capacity: data.capacity,
        ticket_price: data.ticket_price,
        image_url: data.banner_image_url || data.image_url,
        created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
      }
    })

    return {
      data: events,
      lastDoc: hasMore ? docs[docs.length - 1] : null,
      hasMore,
    }
  } catch (error) {
    console.error('Error fetching organizer events:', error)
    return { data: [], lastDoc: null, hasMore: false }
  }
}

/**
 * Get count of organizer's events by status (server-side, aggregation)
 */
export async function getOrganizerEventsCounts(organizerId: string): Promise<{
  total: number
  published: number
  draft: number
  cancelled: number
}> {
  try {
    const [totalSnap, publishedSnap, draftSnap, cancelledSnap] = await Promise.all([
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
        .where('status', '==', 'cancelled')
        .count()
        .get(),
    ])

    return {
      total: totalSnap.data().count,
      published: publishedSnap.data().count,
      draft: draftSnap.data().count,
      cancelled: cancelledSnap.data().count,
    }
  } catch (error) {
    console.error('Error getting event counts:', error)
    return { total: 0, published: 0, draft: 0, cancelled: 0 }
  }
}

/**
 * Get admin events with filters and pagination (server-side)
 */
export async function getAdminEvents(
  filters: EventFilters = {},
  pageSize: number = 50,
  lastDocument?: DocumentSnapshot
): Promise<PaginatedResult<Event>> {
  try {
    let queryRef = adminDb.collection('events').orderBy('created_at', 'desc')

    if (filters.city) {
      queryRef = queryRef.where('city', '==', filters.city) as any
    }

    if (filters.category) {
      queryRef = queryRef.where('category', '==', filters.category) as any
    }

    if (filters.status) {
      queryRef = queryRef.where('status', '==', filters.status) as any
    }

    queryRef = queryRef.limit(pageSize + 1) as any

    if (lastDocument) {
      queryRef = queryRef.startAfter(lastDocument) as any
    }

    const snapshot = await queryRef.get()
    const hasMore = snapshot.docs.length > pageSize
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs

    let events = docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        organizer_id: data.organizer_id,
        title: data.title,
        description: data.description,
        category: data.category,
        venue_name: data.venue_name,
        city: data.city,
        commune: data.commune,
        address: data.address,
        status: data.status || 'draft',
        start_datetime: data.start_datetime?.toDate?.()?.toISOString() || data.start_datetime,
        end_datetime: data.end_datetime?.toDate?.()?.toISOString() || data.end_datetime,
        capacity: data.capacity,
        ticket_price: data.ticket_price,
        image_url: data.banner_image_url || data.image_url,
        created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
      }
    })

    // Apply search filter in memory
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      events = events.filter((event: Event) =>
        event.title?.toLowerCase().includes(searchLower) ||
        event.city?.toLowerCase().includes(searchLower)
      )
    }

    return {
      data: events,
      lastDoc: hasMore ? docs[docs.length - 1] : null,
      hasMore,
    }
  } catch (error) {
    console.error('Error fetching admin events:', error)
    return { data: [], lastDoc: null, hasMore: false }
  }
}

// ============================================================================
// CLIENT-SIDE FUNCTIONS (use db)
// ============================================================================

/**
 * Get organizer's events (client-side) with pagination
 * Use this from client components only
 */
export async function getOrganizerEventsClient(
  organizerId: string,
  pageSize: number = 20,
  lastDocument?: DocumentSnapshot
): Promise<PaginatedResult<Event>> {
  try {
    const constraints: QueryConstraint[] = [
      where('organizer_id', '==', organizerId),
      orderBy('created_at', 'desc'),
      limit(pageSize + 1),
    ]

    if (lastDocument) {
      constraints.push(startAfter(lastDocument))
    }

    const q = query(collection(db, 'events'), ...constraints)
    const snapshot = await getDocs(q)

    const hasMore = snapshot.docs.length > pageSize
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs

    const events = docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        organizer_id: data.organizer_id,
        title: data.title,
        description: data.description,
        category: data.category,
        venue_name: data.venue_name,
        city: data.city,
        commune: data.commune,
        address: data.address,
        status: data.status || 'draft',
        start_datetime: data.start_datetime instanceof Timestamp 
          ? data.start_datetime.toDate().toISOString() 
          : data.start_datetime,
        end_datetime: data.end_datetime instanceof Timestamp 
          ? data.end_datetime.toDate().toISOString() 
          : data.end_datetime,
        capacity: data.capacity,
        ticket_price: data.ticket_price,
        image_url: data.banner_image_url || data.image_url,
        created_at: data.created_at instanceof Timestamp 
          ? data.created_at.toDate().toISOString() 
          : data.created_at,
        updated_at: data.updated_at instanceof Timestamp 
          ? data.updated_at.toDate().toISOString() 
          : data.updated_at,
      } as Event
    })

    return {
      data: events,
      lastDoc: hasMore ? docs[docs.length - 1] : null,
      hasMore,
    }
  } catch (error) {
    console.error('Error fetching organizer events (client):', error)
    return { data: [], lastDoc: null, hasMore: false }
  }
}

/**
 * Get event count for organizer (client-side, aggregation)
 */
export async function getOrganizerEventsCountClient(organizerId: string): Promise<number> {
  try {
    const q = query(
      collection(db, 'events'),
      where('organizer_id', '==', organizerId)
    )
    const snapshot = await getCountFromServer(q)
    return snapshot.data().count
  } catch (error) {
    console.error('Error counting events (client):', error)
    return 0
  }
}
