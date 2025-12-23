import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { adminDb } from '@/lib/firebase/admin'

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'pending'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Fetch withdrawal requests
    let query = adminDb
      .collection('withdrawal_requests')
      .orderBy('createdAt', 'desc')
      .limit(limit)

    if (status !== 'all') {
      query = query.where('status', '==', status) as any
    }

    const snapshot = await query.get()

    const normalizeAmountToCents = (raw: any): number => {
      const n = Number(raw)
      if (!Number.isFinite(n)) return 0
      // Legacy: some records stored dollars. New: cents.
      // Heuristic: valid withdrawals are >= 5000 cents ($50.00). If integer < 5000, treat as dollars.
      if (!Number.isInteger(n)) return Math.round(n * 100)
      if (n > 0 && n < 5000) return n * 100
      return n
    }

    const withdrawals = await Promise.all(
      snapshot.docs.map(async (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        const data = doc.data()
        const amount = normalizeAmountToCents(data.amount)
        
        // Fetch event details
        const eventDoc = await adminDb.collection('events').doc(data.eventId).get()
        const event = eventDoc.exists ? eventDoc.data() : null

        // Fetch organizer details
        const organizerDoc = await adminDb.collection('users').doc(data.organizerId).get()
        const organizer = organizerDoc.exists ? organizerDoc.data() : null

        return {
          id: doc.id,
          ...data,
          amount,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          processedAt: data.processedAt?.toDate?.()?.toISOString() || data.processedAt,
          event: event ? {
            id: data.eventId,
            title: event.title,
            date: event.start_datetime || event.date_time
          } : null,
          organizer: organizer ? {
            id: data.organizerId,
            name: organizer.full_name || organizer.name,
            email: organizer.email
          } : null
        }
      })
    )

    return NextResponse.json({ withdrawals })
  } catch (err: any) {
    console.error('Error fetching withdrawals:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch withdrawals' },
      { status: 500 }
    )
  }
}
