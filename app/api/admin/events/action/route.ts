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
    const eventDoc = await eventRef.get()

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
