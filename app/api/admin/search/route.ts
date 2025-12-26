import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'

interface SearchResult {
  id: string
  type: 'event' | 'user' | 'order'
  title: string
  subtitle?: string
  href: string
  metadata?: {
    status?: string
    price?: number
    currency?: string
    city?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query } = body

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json({ results: [] })
    }

    const searchTerm = query.toLowerCase().trim()
    const results: SearchResult[] = []

    // OPTIMIZATION: Fetch all data in parallel first, then filter
    const [eventsSnapshot, usersSnapshot, ticketsSnapshot] = await Promise.all([
      adminDb.collection('events')
        .orderBy('created_at', 'desc')
        .limit(50)
        .get()
        .catch((err: any) => {
          console.error('Events query error:', err)
          return null
        }),
      adminDb.collection('users')
        .orderBy('created_at', 'desc')
        .limit(50)
        .get()
        .catch((err: any) => {
          console.error('Users query error:', err)
          return null
        }),
      adminDb.collection('tickets')
        .orderBy('purchased_at', 'desc')
        .limit(50)
        .get()
        .catch((err: any) => {
          console.error('Tickets query error:', err)
          return null
        })
    ])

    // Build user cache for efficient lookups
    const userCache = new Map<string, { name: string; email: string }>()
    if (usersSnapshot) {
      for (const doc of usersSnapshot.docs) {
        const data = doc.data()
        userCache.set(doc.id, {
          name: data.name || '',
          email: data.email || ''
        })
      }
    }

    // Build event cache for efficient lookups
    const eventCache = new Map<string, string>()
    if (eventsSnapshot) {
      for (const doc of eventsSnapshot.docs) {
        const data = doc.data()
        eventCache.set(doc.id, data.title || 'Untitled Event')
      }
    }

    // Search events (title, venue_name, city, category)
    if (eventsSnapshot) {
      for (const doc of eventsSnapshot.docs) {
        if (results.length >= 20) break

        const data = doc.data()
        
        // Get organizer info from cache
        const organizer = data.organizer_id ? userCache.get(data.organizer_id) : null
        const organizerName = organizer?.name || organizer?.email || ''

        const searchableText = [
          data.title || '',
          data.description || '',
          data.venue_name || '',
          data.city || '',
          data.category || '',
          organizerName
        ].join(' ').toLowerCase()

        if (searchableText.includes(searchTerm)) {
          results.push({
            id: doc.id,
            type: 'event',
            title: data.title || 'Untitled Event',
            subtitle: organizerName ? `by ${organizerName}` : (data.city ? `in ${data.city}` : undefined),
            href: `/admin/events?selected=${doc.id}`,
            metadata: {
              status: data.is_published ? 'published' : 'draft',
              city: data.city,
              price: data.ticket_price,
              currency: data.currency || 'HTG'
            }
          })
        }
      }
    }

    // Search users (name, email, business name)
    if (results.length < 20 && usersSnapshot) {
      for (const doc of usersSnapshot.docs) {
        if (results.length >= 20) break

        const data = doc.data()
        const searchableText = [
          data.name || '',
          data.email || '',
          data.phone_number || '',
          data.business_name || ''
        ].join(' ').toLowerCase()

        if (searchableText.includes(searchTerm)) {
          results.push({
            id: doc.id,
            type: 'user',
            title: data.name || data.email || 'Unknown User',
            subtitle: data.email && data.name ? data.email : (data.business_name || undefined),
            href: `/admin/users?selected=${doc.id}`,
            metadata: {
              status: data.is_verified ? 'verified' : 'unverified'
            }
          })
        }
      }
    }

    // Search tickets (order ID, attendee name, attendee email)
    if (results.length < 20 && ticketsSnapshot) {
      for (const doc of ticketsSnapshot.docs) {
        if (results.length >= 20) break

        const data = doc.data()
        const searchableText = [
          doc.id,
          data.attendee_name || '',
          data.attendee_email || '',
          data.order_id || ''
        ].join(' ').toLowerCase()

        if (searchableText.includes(searchTerm)) {
          // Get event name from cache
          const eventName = data.event_id ? (eventCache.get(data.event_id) || 'Unknown Event') : 'Unknown Event'

          results.push({
            id: doc.id,
            type: 'order',
            title: `Order ${doc.id.substring(0, 8)}...`,
            subtitle: `${eventName} • ${data.attendee_name || data.attendee_email || 'Unknown'}`,
            href: `/admin/orders?selected=${doc.id}`,
            metadata: {
              status: data.status,
              price: data.price,
              currency: data.currency || 'HTG'
            }
          })
        }
      }
    }

    console.log(`Admin search: "${query}" returned ${results.length} results`)
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Admin search error:', error)
    return NextResponse.json(
      { error: 'Failed to search', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
