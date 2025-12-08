import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    
    // Check if user is admin
    const userDoc = await adminDb.collection('users').doc(decodedClaims.uid).get()
    const userData = userDoc.data()

    if (userData?.role !== 'admin') {
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
      admin_id: decodedClaims.uid,
      admin_email: userData?.email,
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
