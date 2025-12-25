import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'

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

    const { organizerId, decision, reason } = await request.json()

    if (!organizerId || !decision) {
      return NextResponse.json(
        { error: 'Organization ID and decision are required' },
        { status: 400 }
      )
    }

    if (decision !== 'approve' && decision !== 'reject') {
      return NextResponse.json(
        { error: 'Decision must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    const newStatus = decision === 'approve' ? 'verified' : 'failed'

    // Update verification document
    await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('verificationDocuments')
      .doc('bank')
      .update({
        status: newStatus,
        reviewedAt: new Date().toISOString(),
        reviewedBy: decodedClaims.uid,
        rejectionReason: decision === 'reject' ? reason : null,
      })

    // TODO: Send email notification to organizer
    // In production, you would notify the organizer of the decision

    return NextResponse.json({
      success: true,
      message: `Bank verification ${decision}d successfully`,
      status: newStatus,
    })
  } catch (error: any) {
    console.error('Error processing bank verification:', error)
    return NextResponse.json(
      { error: 'Failed to process verification', message: error.message },
      { status: 500 }
    )
  }
}
