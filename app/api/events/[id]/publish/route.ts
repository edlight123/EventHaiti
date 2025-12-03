import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAuth } from '@/lib/auth'
import { createNotification } from '@/lib/notifications/helpers'
import { sendPushNotification } from '@/lib/notification-triggers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { is_published } = body

    // Verify event ownership
    const eventDoc = await adminDb.collection('events').doc(id).get()
    
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const eventData = eventDoc.data()!
    
    if (eventData.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update publish status
    await adminDb.collection('events').doc(id).update({
      is_published,
      updated_at: new Date()
    })

    // If publishing for the first time, notify followers
    if (is_published && !eventData.is_published) {
      try {
        // Get organizer followers from Firestore
        const followersSnapshot = await adminDb
          .collection('organizer_follows')
          .where('organizer_id', '==', user.id)
          .get()

        const followerIds = followersSnapshot.docs.map(doc => doc.data().follower_id)

        if (followerIds.length > 0) {
          // Notify each follower
          const notifications = followerIds.map(async (followerId) => {
            // Create in-app notification
            await createNotification(
              followerId,
              'event_created',
              `New Event: ${eventData.title}`,
              `${eventData.organizer_name || 'An organizer you follow'} just published a new event!`,
              `/events/${id}`,
              { eventId: id, organizerId: user.id }
            )

            // Send push notification
            await sendPushNotification(
              followerId,
              `📅 New Event from ${eventData.organizer_name || 'Organizer'}`,
              eventData.title,
              `/events/${id}`,
              {
                type: 'new_event',
                eventId: id,
                organizerId: user.id
              }
            )
          })

          await Promise.all(notifications)
          console.log(`Notified ${followerIds.length} followers about new event: ${eventData.title}`)
        }
      } catch (notifyError) {
        console.error('Error notifying followers:', notifyError)
        // Don't fail the publish operation if notifications fail
      }
    }

    return NextResponse.json({ success: true, is_published })
  } catch (error) {
    console.error('Error toggling publish status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
