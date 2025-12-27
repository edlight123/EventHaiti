import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { assertEventOwner } from '@/app/api/staff/_utils'
import { Transaction } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth('organizer')
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const eventId = String(body?.eventId || '')
    const memberId = String(body?.memberId || '')

    if (!eventId) return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    if (!memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 })

    await assertEventOwner({ eventId, uid: user.id })

    const memberRef = adminDb.collection('events').doc(eventId).collection('members').doc(memberId)

    await adminDb.runTransaction(async (tx: Transaction) => {
      const snap = await tx.get(memberRef)
      if (!snap.exists) {
        throw new Error('Member not found')
      }
      tx.delete(memberRef)
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    const message = err?.message || 'Failed to remove member'
    const status = message === 'Member not found' ? 404 : message.includes('Only the event owner') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
