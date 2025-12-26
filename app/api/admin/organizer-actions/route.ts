import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 })
    }

    const { organizerId, action } = await request.json()

    if (!organizerId || !action) {
      return NextResponse.json(
        { error: 'Organizer ID and action are required' },
        { status: 400 }
      )
    }

    // Validate action
    const validActions = ['ban', 'unban', 'disable_posting', 'enable_posting']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    // Get organizer data
    const organizerDocRef = adminDb.collection('users').doc(organizerId)
    const organizerDoc = await organizerDocRef.get()

    if (!organizerDoc.exists) {
      return NextResponse.json(
        { error: 'Organizer not found' },
        { status: 404 }
      )
    }

    const organizerData = organizerDoc.data()

    // Perform action
    const updates: any = {
      updated_at: new Date()
    }

    let successMessage = ''

    switch (action) {
      case 'ban':
        updates.status = 'banned'
        updates.can_create_events = false
        successMessage = 'Organizer has been banned successfully'
        break
      
      case 'unban':
        updates.status = 'active'
        updates.can_create_events = true
        successMessage = 'Organizer has been unbanned successfully'
        break
      
      case 'disable_posting':
        updates.can_create_events = false
        successMessage = 'Event posting has been disabled for this organizer'
        break
      
      case 'enable_posting':
        updates.can_create_events = true
        successMessage = 'Event posting has been enabled for this organizer'
        break
    }

    // Update the user document
    await organizerDocRef.update(updates)

    // Log the action
    await adminDb.collection('admin_actions').add({
      admin_id: user.id,
      admin_email: user.email,
      action: action,
      target_user_id: organizerId,
      target_user_email: organizerData?.email,
      timestamp: new Date(),
      details: updates
    })

    return NextResponse.json({
      success: true,
      message: successMessage
    })

  } catch (error: any) {
    console.error('Error performing organizer action:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to perform action' },
      { status: 500 }
    )
  }
}
