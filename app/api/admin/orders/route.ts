import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { adminDb } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

function serializeFirestoreValue(value: any): any {
  if (value == null) return value
  if (typeof value?.toDate === 'function') {
    try {
      const d = value.toDate()
      if (d instanceof Date) return d.toISOString()
    } catch {
      // ignore
    }
  }
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(serializeFirestoreValue)
  if (typeof value === 'object') {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) out[k] = serializeFirestoreValue(v)
    return out
  }
  return value
}

export async function GET(request: Request) {
  try {
    const { user, error } = await requireAdmin()
    if (error || !user) {
      return adminError(error || 'Unauthorized', 401)
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100)
    const status = searchParams.get('status') || ''
    const paymentMethod = searchParams.get('paymentMethod') || ''
    const currency = searchParams.get('currency') || ''
    const eventId = searchParams.get('eventId') || ''
    const search = searchParams.get('search') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const sortBy = searchParams.get('sortBy') || 'newest'

    // Build query
    let queryRef: any = adminDb.collection('tickets')

    // Apply filters
    if (status && status !== 'all') {
      queryRef = queryRef.where('status', '==', status)
    }

    if (paymentMethod && paymentMethod !== 'all') {
      queryRef = queryRef.where('payment_method', '==', paymentMethod)
    }

    if (currency && currency !== 'all') {
      queryRef = queryRef.where('currency', '==', currency.toUpperCase())
    }

    if (eventId) {
      queryRef = queryRef.where('event_id', '==', eventId)
    }

    // Date filters
    if (startDate) {
      const start = new Date(startDate)
      queryRef = queryRef.where('purchased_at', '>=', start)
    }

    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      queryRef = queryRef.where('purchased_at', '<=', end)
    }

    // Sorting
    if (sortBy === 'oldest') {
      queryRef = queryRef.orderBy('purchased_at', 'asc')
    } else if (sortBy === 'highest') {
      queryRef = queryRef.orderBy('price_paid', 'desc')
    } else if (sortBy === 'lowest') {
      queryRef = queryRef.orderBy('price_paid', 'asc')
    } else {
      queryRef = queryRef.orderBy('purchased_at', 'desc')
    }

    // Get total count (for pagination info)
    const countSnapshot = await queryRef.count().get()
    const totalCount = countSnapshot.data().count

    // Apply pagination
    const offset = (page - 1) * pageSize
    queryRef = queryRef.limit(pageSize).offset(offset)

    const snapshot = await queryRef.get()

    let orders = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...serializeFirestoreValue(doc.data()),
    }))

    // Client-side search filter (Firestore doesn't support text search)
    if (search) {
      const searchLower = search.toLowerCase()
      orders = orders.filter((order: any) => {
        const email = (order.attendee_email || order.attendeeEmail || order.email || '').toLowerCase()
        const name = (order.attendee_name || order.attendeeName || '').toLowerCase()
        const id = order.id.toLowerCase()
        return email.includes(searchLower) || name.includes(searchLower) || id.includes(searchLower)
      })
    }

    // Fetch event names for display
    const eventIds = [...new Set(orders.map((o: any) => o.event_id || o.eventId).filter(Boolean))]
    const eventNames: Record<string, string> = {}

    if (eventIds.length > 0) {
      // Batch fetch events (max 10 per query due to Firestore 'in' limit)
      for (let i = 0; i < eventIds.length; i += 10) {
        const batch = eventIds.slice(i, i + 10)
        try {
          const eventsSnap = await adminDb.collection('events').where('__name__', 'in', batch).get()
          eventsSnap.docs.forEach((doc: any) => {
            eventNames[doc.id] = doc.data()?.title || doc.data()?.name || 'Unknown Event'
          })
        } catch (e) {
          console.warn('Failed to fetch event names batch', e)
        }
      }
    }

    // Enrich orders with event names
    orders = orders.map((order: any) => ({
      ...order,
      event_name: eventNames[order.event_id || order.eventId] || 'Unknown Event',
    }))

    return adminOk({
      orders,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasMore: page * pageSize < totalCount,
      },
    })
  } catch (error: any) {
    console.error('Admin orders error:', error)
    return adminError('Failed to fetch orders', 500, error.message || String(error))
  }
}

// Get order analytics/summary
export async function POST(request: Request) {
  try {
    const { user, error } = await requireAdmin()
    if (error || !user) {
      return adminError(error || 'Unauthorized', 401)
    }

    const body = await request.json()
    const { type } = body

    if (type === 'summary') {
      // Get orders summary statistics
      const ticketsRef = adminDb.collection('tickets')

      // Total orders
      const totalSnap = await ticketsRef.count().get()
      const totalOrders = totalSnap.data().count

      // By status
      const confirmedSnap = await ticketsRef.where('status', '==', 'confirmed').count().get()
      const pendingSnap = await ticketsRef.where('status', '==', 'pending').count().get()
      const cancelledSnap = await ticketsRef.where('status', '==', 'cancelled').count().get()
      const refundedSnap = await ticketsRef.where('status', '==', 'refunded').count().get()

      // Get revenue data (last 30 days for trend)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const recentTickets = await ticketsRef
        .where('status', 'in', ['confirmed', 'valid'])
        .where('purchased_at', '>=', thirtyDaysAgo)
        .get()

      let totalRevenueUSD = 0
      let totalRevenueHTG = 0
      let stripeCount = 0
      let moncashCount = 0
      let natcashCount = 0

      recentTickets.docs.forEach((doc: any) => {
        const data = doc.data()
        const price = parseFloat(data.price_paid || 0)
        const currency = (data.currency || 'USD').toUpperCase()
        const method = (data.payment_method || '').toLowerCase()

        if (currency === 'HTG') {
          totalRevenueHTG += price
        } else {
          totalRevenueUSD += price
        }

        if (method === 'stripe') stripeCount++
        else if (method === 'moncash') moncashCount++
        else if (method === 'natcash') natcashCount++
      })

      // Today's orders
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todaySnap = await ticketsRef.where('purchased_at', '>=', today).count().get()

      return adminOk({
        summary: {
          totalOrders,
          todayOrders: todaySnap.data().count,
          byStatus: {
            confirmed: confirmedSnap.data().count,
            pending: pendingSnap.data().count,
            cancelled: cancelledSnap.data().count,
            refunded: refundedSnap.data().count,
          },
          last30Days: {
            orders: recentTickets.size,
            revenueUSD: totalRevenueUSD,
            revenueHTG: totalRevenueHTG,
            avgOrderValueUSD: recentTickets.size > 0 ? totalRevenueUSD / recentTickets.size : 0,
          },
          byPaymentMethod: {
            stripe: stripeCount,
            moncash: moncashCount,
            natcash: natcashCount,
          },
        },
      })
    }

    return adminError('Invalid type parameter', 400)
  } catch (error: any) {
    console.error('Admin orders summary error:', error)
    return adminError('Failed to fetch summary', 500, error.message || String(error))
  }
}
