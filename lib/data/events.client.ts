/**
 * Events Data Layer - Client Side
 * 
 * Client-side data access for events. Safe to import in client components.
 * Uses Firebase Client SDK.
 */

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

export interface PaginatedResult<T> {
  data: T[]
  lastDoc: DocumentSnapshot | null
  hasMore: boolean
  total?: number
}

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
        ...data,
        start_datetime: data.start_datetime instanceof Timestamp 
          ? data.start_datetime.toDate().toISOString() 
          : data.start_datetime,
        end_datetime: data.end_datetime instanceof Timestamp 
          ? data.end_datetime.toDate().toISOString() 
          : data.end_datetime,
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

/**
 * Get a single event by ID (client-side)
 */
export async function getEventByIdClient(eventId: string): Promise<Event | null> {
  try {
    const eventDoc = await getDoc(doc(db, 'events', eventId))
    
    if (!eventDoc.exists()) {
      return null
    }

    const data = eventDoc.data()
    return {
      id: eventDoc.id,
      ...data,
      start_datetime: data.start_datetime instanceof Timestamp 
        ? data.start_datetime.toDate().toISOString() 
        : data.start_datetime,
      end_datetime: data.end_datetime instanceof Timestamp 
        ? data.end_datetime.toDate().toISOString() 
        : data.end_datetime,
      created_at: data.created_at instanceof Timestamp 
        ? data.created_at.toDate().toISOString() 
        : data.created_at,
      updated_at: data.updated_at instanceof Timestamp 
        ? data.updated_at.toDate().toISOString() 
        : data.updated_at,
    } as Event
  } catch (error) {
    console.error('Error fetching event (client):', error)
    return null
  }
}
