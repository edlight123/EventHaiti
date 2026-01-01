import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'organizer' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const eventDoc = await adminDb.collection('events').doc(id).get()
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const eventData = eventDoc.data() as any
    if (eventData?.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this event' }, { status: 403 })
    }

    const earningsSnapshot = await adminDb
      .collection('event_earnings')
      .where('eventId', '==', id)
      .limit(1)
      .get()

    if (earningsSnapshot.empty) {
      return NextResponse.json({ earnings: null }, { status: 200 })
    }

    const data = earningsSnapshot.docs[0].data() as any

    return NextResponse.json(
      {
        earnings: {
          availableToWithdraw: Number(data?.availableToWithdraw || 0),
          currency: String(data?.currency || 'HTG').toUpperCase() === 'USD' ? 'USD' : 'HTG',
          settlementStatus: data?.settlementStatus || 'pending',
          totalEarned: Number(data?.totalEarned || 0),
          withdrawnAmount: Number(data?.withdrawnAmount || 0),
        },
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('GET /api/organizer/events/[id]/earnings error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
