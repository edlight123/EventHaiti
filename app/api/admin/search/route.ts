import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { getCurrentUser } from '@/lib/auth'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(e => e)

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
    if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query } = body

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json({ results: [] })
    }

    const searchTerm = query.toLowerCase().trim()
    const results: SearchResult[] = []

    // Search events (title, venue_name, city, organizer name)
    const eventsSnapshot = await adminDb.collection('events')
      .orderBy('created_at', 'desc')
      .limit(100)
      .get()

    for (const doc of eventsSnapshot.docs) {
      const data = doc.data()
      
      // Get organizer name if available
      let organizerName = ''
      if (data.organizer_id) {
        try {
          const organizerDoc = await adminDb.collection('users').doc(data.organizer_id).get()
          if (organizerDoc.exists) {
            const orgData = organizerDoc.data()
            organizerName = orgData?.name || orgData?.email || ''
          }
        } catch (error) {
          console.error('Error fetching organizer:', error)
        }
      }

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
          subtitle: organizerName ? `by ${organizerName}` : undefined,
          href: `/admin/events?selected=${doc.id}`,
          metadata: {
            status: data.is_published ? 'published' : 'draft',
            city: data.city,
            price: data.ticket_price,
            currency: data.currency || 'HTG'
          }
        })

        if (results.length >= 20) break
      }
    }

    // Search users (name, email, business name)
    if (results.length < 20) {
      const usersSnapshot = await adminDb.collection('users')
        .orderBy('created_at', 'desc')
        .limit(100)
        .get()

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
            subtitle: data.email && data.name ? data.email : undefined,
            href: `/admin/users?selected=${doc.id}`,
            metadata: {
              status: data.is_verified ? 'verified' : 'unverified'
            }
          })
        }
      }
    }

    // Search orders (order ID, attendee name, attendee email)
    if (results.length < 20) {
      const ticketsSnapshot = await adminDb.collection('tickets')
        .where('status', '==', 'confirmed')
        .orderBy('purchased_at', 'desc')
        .limit(100)
        .get()

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
          // Get event name
          let eventName = 'Unknown Event'
          if (data.event_id) {
            try {
              const eventDoc = await adminDb.collection('events').doc(data.event_id).get()
              if (eventDoc.exists) {
                eventName = eventDoc.data()?.title || 'Unknown Event'
              }
            } catch (error) {
              console.error('Error fetching event:', error)
            }
          }

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

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Admin search error:', error)
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    )
  }
}
