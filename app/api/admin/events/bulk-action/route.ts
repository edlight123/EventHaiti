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

    const effectiveAdminEmail = adminEmail || user.email || 'unknown'

    // Firestore batch limit is 500 ops; delete+backup is 2 ops per event.
    // Keep a conservative chunk size.
    const chunkSize = 200
    let processed = 0

    for (let i = 0; i < eventIds.length; i += chunkSize) {
      const chunk: string[] = eventIds.slice(i, i + chunkSize)
      const batch = adminDb.batch()

      for (const eventId of chunk) {
        if (!eventId) continue

        if (action === 'restore') {
          const deletedRef = adminDb.collection('events_deleted').doc(eventId)
          const deletedDoc = await deletedRef.get()
          if (!deletedDoc.exists) continue

          const deletedData = deletedDoc.data() || {}
          const { deletedAt, deletedBy, deletedReason, ...eventData } = deletedData

          const eventRef = adminDb.collection('events').doc(eventId)
          batch.set(
            eventRef,
            {
              ...eventData,
              restored_at: new Date(),
              restored_by: effectiveAdminEmail,
              updated_at: new Date(),
            },
            { merge: true }
          )
          batch.delete(deletedRef)

          await logAdminAction({
            action: 'event.restore',
            adminId,
            adminEmail: effectiveAdminEmail,
            resourceId: eventId,
            resourceType: 'event',
            details: { eventTitle: (eventData as any)?.title || deletedData?.title || 'Untitled', bulk: true },
          })

          processed++
          continue
        }

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
            processed++
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
            processed++
            break

          case 'delete': {
            const deletedRef = adminDb.collection('events_deleted').doc(eventId)
            batch.set(
              deletedRef,
              {
                ...eventData,
                id: eventId,
                deletedAt: new Date().toISOString(),
                deletedBy: effectiveAdminEmail,
                deletedReason: null,
              },
              { merge: true }
            )
            batch.delete(eventRef)
            await logAdminAction({
              action: 'event.delete',
              adminId,
              adminEmail,
              resourceId: eventId,
              resourceType: 'event',
              details: { eventTitle: eventData.title, bulk: true }
            })
            processed++
            break
          }
        }
      }

      await batch.commit()
    }

    return NextResponse.json({ success: true, count: processed })
  } catch (error) {
    console.error('Error performing bulk action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
