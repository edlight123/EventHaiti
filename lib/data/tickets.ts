/**
 * Tickets Data Layer
 * 
 * Centralized data access for tickets with proper caching, pagination, and optimization.
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

export interface Ticket {
  id: string
  event_id: string
  attendee_id: string
  status: 'confirmed' | 'cancelled' | 'refunded' | 'pending'
  ticket_type: string
  price_paid: number
  checked_in: boolean
  checked_in_at?: string
  purchased_at: string
  qr_code?: string
  created_at: string
  updated_at: string
  [key: string]: any
}

export interface TicketFilters {
  eventId?: string
  attendeeId?: string
  status?: string
  checkedIn?: boolean
}

export interface PaginatedTickets {
  data: Ticket[]
  lastDoc: DocumentSnapshot | null
  hasMore: boolean
  total?: number
}

// ============================================================================
// SERVER-SIDE FUNCTIONS (use adminDb)
// ============================================================================

/**
 * Get tickets for an event with pagination (server-side)
 */
export async function getEventTickets(
  eventId: string,
  pageSize: number = 50,
  lastDocument?: DocumentSnapshot,
  filters: TicketFilters = {}
): Promise<PaginatedTickets> {
  try {
    let queryRef = adminDb.collection('tickets')
      .where('event_id', '==', eventId)
      .orderBy('purchased_at', 'desc')

    // Apply filters
    if (filters.status) {
      queryRef = queryRef.where('status', '==', filters.status) as any
    }

    if (filters.checkedIn !== undefined) {
      queryRef = queryRef.where('checked_in', '==', filters.checkedIn) as any
    }

    queryRef = queryRef.limit(pageSize + 1) as any

    if (lastDocument) {
      queryRef = queryRef.startAfter(lastDocument) as any
    }

    const snapshot = await queryRef.get()
    const hasMore = snapshot.docs.length > pageSize
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs

    const tickets = docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        purchased_at: data.purchased_at?.toDate?.()?.toISOString() || data.purchased_at,
        checked_in_at: data.checked_in_at?.toDate?.()?.toISOString() || data.checked_in_at,
        created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
      }
    })

    return {
      data: tickets,
      lastDoc: hasMore ? docs[docs.length - 1] : null,
      hasMore,
    }
  } catch (error) {
    console.error('Error fetching event tickets:', error)
    return { data: [], lastDoc: null, hasMore: false }
  }
}

/**
 * Get tickets for a user (server-side)
 */
export async function getUserTickets(
  userId: string,
  pageSize: number = 50,
  lastDocument?: DocumentSnapshot
): Promise<PaginatedTickets> {
  try {
    let queryRef = adminDb.collection('tickets')
      .where('attendee_id', '==', userId)
      .where('status', '==', 'confirmed')
      .orderBy('purchased_at', 'desc')
      .limit(pageSize + 1) as any

    if (lastDocument) {
      queryRef = queryRef.startAfter(lastDocument) as any
    }

    const snapshot = await queryRef.get()
    const hasMore = snapshot.docs.length > pageSize
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs

    const tickets = docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        purchased_at: data.purchased_at?.toDate?.()?.toISOString() || data.purchased_at,
        checked_in_at: data.checked_in_at?.toDate?.()?.toISOString() || data.checked_in_at,
        created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
      }
    })

    return {
      data: tickets,
      lastDoc: hasMore ? docs[docs.length - 1] : null,
      hasMore,
    }
  } catch (error) {
    console.error('Error fetching user tickets:', error)
    return { data: [], lastDoc: null, hasMore: false }
  }
}

/**
 * Get ticket counts for an event using Firestore aggregation (server-side)
 */
export async function getEventTicketCounts(eventId: string): Promise<{
  total: number
  confirmed: number
  checkedIn: number
  cancelled: number
  refunded: number
}> {
  try {
    const [totalSnap, confirmedSnap, checkedInSnap, cancelledSnap, refundedSnap] = await Promise.all([
      adminDb.collection('tickets')
        .where('event_id', '==', eventId)
        .count()
        .get(),
      adminDb.collection('tickets')
        .where('event_id', '==', eventId)
        .where('status', '==', 'confirmed')
        .count()
        .get(),
      adminDb.collection('tickets')
        .where('event_id', '==', eventId)
        .where('checked_in', '==', true)
        .count()
        .get(),
      adminDb.collection('tickets')
        .where('event_id', '==', eventId)
        .where('status', '==', 'cancelled')
        .count()
        .get(),
      adminDb.collection('tickets')
        .where('event_id', '==', eventId)
        .where('status', '==', 'refunded')
        .count()
        .get(),
    ])

    return {
      total: totalSnap.data().count,
      confirmed: confirmedSnap.data().count,
      checkedIn: checkedInSnap.data().count,
      cancelled: cancelledSnap.data().count,
      refunded: refundedSnap.data().count,
    }
  } catch (error) {
    console.error('Error getting ticket counts:', error)
    return { total: 0, confirmed: 0, checkedIn: 0, cancelled: 0, refunded: 0 }
  }
}

/**
 * Get a single ticket by ID (server-side)
 */
export async function getTicketById(ticketId: string): Promise<Ticket | null> {
  try {
    const ticketDoc = await adminDb.collection('tickets').doc(ticketId).get()
    
    if (!ticketDoc.exists) {
      return null
    }

    const data = ticketDoc.data()
    return {
      id: ticketDoc.id,
      ...data,
      purchased_at: data?.purchased_at?.toDate?.()?.toISOString() || data?.purchased_at,
      checked_in_at: data?.checked_in_at?.toDate?.()?.toISOString() || data?.checked_in_at,
      created_at: data?.created_at?.toDate?.()?.toISOString() || data?.created_at,
      updated_at: data?.updated_at?.toDate?.()?.toISOString() || data?.updated_at,
    } as Ticket
  } catch (error) {
    console.error('Error fetching ticket:', error)
    return null
  }
}

// ============================================================================
// CLIENT-SIDE FUNCTIONS (use db)
// ============================================================================

/**
 * Get user's tickets (client-side)
 */
export async function getUserTicketsClient(
  userId: string,
  pageSize: number = 50,
  lastDocument?: DocumentSnapshot
): Promise<PaginatedTickets> {
  try {
    const constraints: QueryConstraint[] = [
      where('attendee_id', '==', userId),
      where('status', '==', 'confirmed'),
      orderBy('purchased_at', 'desc'),
      limit(pageSize + 1),
    ]

    if (lastDocument) {
      constraints.push(startAfter(lastDocument))
    }

    const q = query(collection(db, 'tickets'), ...constraints)
    const snapshot = await getDocs(q)

    const hasMore = snapshot.docs.length > pageSize
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs

    const tickets = docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        purchased_at: data.purchased_at instanceof Timestamp 
          ? data.purchased_at.toDate().toISOString() 
          : data.purchased_at,
        checked_in_at: data.checked_in_at instanceof Timestamp 
          ? data.checked_in_at.toDate().toISOString() 
          : data.checked_in_at,
        created_at: data.created_at instanceof Timestamp 
          ? data.created_at.toDate().toISOString() 
          : data.created_at,
        updated_at: data.updated_at instanceof Timestamp 
          ? data.updated_at.toDate().toISOString() 
          : data.updated_at,
      } as Ticket
    })

    return {
      data: tickets,
      lastDoc: hasMore ? docs[docs.length - 1] : null,
      hasMore,
    }
  } catch (error) {
    console.error('Error fetching user tickets (client):', error)
    return { data: [], lastDoc: null, hasMore: false }
  }
}

/**
 * Get user's ticket count (client-side, aggregation)
 */
export async function getUserTicketCountClient(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, 'tickets'),
      where('attendee_id', '==', userId),
      where('status', '==', 'confirmed')
    )
    const snapshot = await getCountFromServer(q)
    return snapshot.data().count
  } catch (error) {
    console.error('Error counting tickets (client):', error)
    return 0
  }
}

/**
 * Get ticket by ID (client-side)
 */
export async function getTicketByIdClient(ticketId: string): Promise<Ticket | null> {
  try {
    const ticketDoc = await getDoc(doc(db, 'tickets', ticketId))
    
    if (!ticketDoc.exists()) {
      return null
    }

    const data = ticketDoc.data()
    return {
      id: ticketDoc.id,
      ...data,
      purchased_at: data.purchased_at instanceof Timestamp 
        ? data.purchased_at.toDate().toISOString() 
        : data.purchased_at,
      checked_in_at: data.checked_in_at instanceof Timestamp 
        ? data.checked_in_at.toDate().toISOString() 
        : data.checked_in_at,
      created_at: data.created_at instanceof Timestamp 
        ? data.created_at.toDate().toISOString() 
        : data.created_at,
      updated_at: data.updated_at instanceof Timestamp 
        ? data.updated_at.toDate().toISOString() 
        : data.updated_at,
    } as Ticket
  } catch (error) {
    console.error('Error fetching ticket (client):', error)
    return null
  }
}
