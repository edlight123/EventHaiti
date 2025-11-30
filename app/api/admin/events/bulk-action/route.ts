import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { adminDb } from '@/lib/firebase/admin'
import { logAdminAction } from '@/lib/admin/audit-log'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()

    if (error || !user || !isAdmin(user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventIds, action, adminId, adminEmail } = await request.json()

    const batch = adminDb.batch()

    for (const eventId of eventIds) {
      const eventRef = adminDb.collection('events').doc(eventId)
      const eventDoc = await eventRef.get()

      if (!eventDoc.exists) continue

      const eventData = eventDoc.data()!

      switch (action) {
        case 'publish':
          batch.update(eventRef, {
            is_published: true,
            rejected: false,
            updated_at: new Date()
          })
          await logAdminAction({
            action: 'event.publish',
            adminId,
            adminEmail,
            resourceId: eventId,
            resourceType: 'event',
            details: { eventTitle: eventData.title, bulk: true }
          })
          break

        case 'unpublish':
          batch.update(eventRef, {
            is_published: false,
            rejected: true,
            updated_at: new Date()
          })
          await logAdminAction({
            action: 'event.unpublish',
            adminId,
            adminEmail,
            resourceId: eventId,
            resourceType: 'event',
            details: { eventTitle: eventData.title, bulk: true }
          })
          break

        case 'delete':
          batch.delete(eventRef)
          await logAdminAction({
            action: 'event.delete',
            adminId,
            adminEmail,
            resourceId: eventId,
            resourceType: 'event',
            details: { eventTitle: eventData.title, bulk: true }
          })
          break
      }
    }

    await batch.commit()

    return NextResponse.json({ success: true, count: eventIds.length })
  } catch (error) {
    console.error('Error performing bulk action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
