import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const uid = user.id

    const snap = await adminDb.collectionGroup('members').where('uid', '==', uid).get()

    const byEventId = new Map<
      string,
      { eventId: string; role: string | null; permissions: any | null }
    >()

    for (const doc of snap.docs) {
      const data: any = doc.data() || {}
      const eventId = String(data?.eventId || doc.ref.parent?.parent?.id || '')
      if (!eventId) continue

      if (!byEventId.has(eventId)) {
        byEventId.set(eventId, {
          eventId,
          role: data?.role ? String(data.role) : null,
          permissions: data?.permissions || null,
        })
      }
    }

    const assignments = Array.from(byEventId.values())
    const eventIds = assignments.map((a) => a.eventId)

    return NextResponse.json({ eventIds, assignments })
  } catch (err: any) {
    const message = err?.message || 'Failed to load staff events'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
