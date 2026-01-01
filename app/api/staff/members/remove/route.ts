import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { assertEventOwner } from '@/app/api/staff/_utils'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'organizer' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const eventId = String(body?.eventId || '')
    const memberId = String(body?.memberId || '')

    if (!eventId) return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    if (!memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 })

    if (user.role !== 'admin') {
      await assertEventOwner({ eventId, uid: user.id })
    }

    const memberRef = adminDb.doc(`events/${eventId}/members/${memberId}`)
    const snap = await memberRef.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    await memberRef.delete()

    return NextResponse.json({ success: true })
  } catch (err: any) {
    const message = err?.message || 'Failed to remove member'
    const status = message.includes('Only the event owner') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
