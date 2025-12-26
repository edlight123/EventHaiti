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

    const { eventId, action, reason, adminId, adminEmail } = await request.json()

    const eventRef = adminDb.collection('events').doc(eventId)
    const deletedRef = adminDb.collection('events_deleted').doc(eventId)
    const effectiveAdminEmail = adminEmail || user.email || 'unknown'

    const eventDoc = await eventRef.get()

    // Special-case restore: bring back from events_deleted
    if (action === 'restore') {
      const deletedDoc = await deletedRef.get()
      if (!deletedDoc.exists) {
        return NextResponse.json({ error: 'Deleted event backup not found' }, { status: 404 })
      }

      const deletedData = deletedDoc.data() || {}
      const { deletedAt, deletedBy, deletedReason, ...eventData } = deletedData

      await eventRef.set(
        {
          ...eventData,
          restored_at: new Date(),
          restored_by: effectiveAdminEmail,
          updated_at: new Date(),
        },
        { merge: true }
      )
      await deletedRef.delete()

      await logAdminAction({
        action: 'event.restore',
        adminId,
        adminEmail: effectiveAdminEmail,
        resourceId: eventId,
        resourceType: 'event',
        details: { eventTitle: (eventData as any)?.title || deletedData?.title || 'Untitled' },
      })

      return NextResponse.json({ success: true })
    }

    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const eventData = eventDoc.data()!

    // Perform action
    switch (action) {
      case 'publish':
        await eventRef.update({
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
          details: { eventTitle: eventData.title }
        })
        break

      case 'unpublish':
        await eventRef.update({
          is_published: false,
          rejected: true,
          rejection_reason: reason,
          updated_at: new Date()
        })
        await logAdminAction({
          action: 'event.unpublish',
          adminId,
          adminEmail,
          resourceId: eventId,
          resourceType: 'event',
          details: { eventTitle: eventData.title, reason }
        })
        break

      case 'delete':
        // Backup before deletion to allow recovery from accidents.
        await deletedRef.set(
          {
            ...eventData,
            id: eventId,
            deletedAt: new Date().toISOString(),
            deletedBy: effectiveAdminEmail,
            deletedReason: typeof reason === 'string' ? reason : null,
          },
          { merge: true }
        )
        await eventRef.delete()
        await logAdminAction({
          action: 'event.delete',
          adminId,
          adminEmail,
          resourceId: eventId,
          resourceType: 'event',
          details: { eventTitle: eventData.title, reason }
        })
        break

      case 'feature':
        await eventRef.update({
          featured: true,
          updated_at: new Date()
        })
        break
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error performing action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
