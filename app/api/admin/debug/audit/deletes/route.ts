import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { adminDb } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()

    if (error || !user || !isAdmin(user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const limitRaw = url.searchParams.get('limit')
    const limit = Math.max(1, Math.min(200, Number(limitRaw || 50) || 50))

    // Avoid requiring a composite index (where+orderBy). Grab recent items by timestamp and filter.
    const snap = await adminDb
      .collection('admin_audit_log')
      .orderBy('timestamp', 'desc')
      .limit(Math.max(limit * 4, 100))
      .get()

    const deletes = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
      .filter((row) => row.action === 'event.delete')
      .slice(0, limit)

    const checked = await Promise.all(
      deletes.map(async (row) => {
        const resourceId = String(row.resourceId || '')
        let existsInEvents: boolean | null = null

        if (resourceId) {
          try {
            const eventDoc = await adminDb.collection('events').doc(resourceId).get()
            existsInEvents = eventDoc.exists
          } catch {
            existsInEvents = null
          }
        }

        return {
          auditId: row.id,
          timestamp: row.timestamp || row.createdAt || row.timestampMs || null,
          adminEmail: row.adminEmail || null,
          resourceId: resourceId || null,
          eventTitle: row?.details?.eventTitle || null,
          existsInEvents,
        }
      })
    )

    return NextResponse.json({
      limit,
      found: checked.length,
      deletes: checked,
    })
  } catch (e: any) {
    console.error('debug/audit/deletes failed:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
