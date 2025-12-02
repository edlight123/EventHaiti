import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'

/**
 * Decline a payout request (admin only)
 * 
 * IDEMPOTENCY: Uses Firestore transaction to prevent double-decline
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const adminUserId = decodedClaims.uid

    // Verify admin role
    const adminDoc = await adminDb.collection('users').doc(adminUserId).get()
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    // Parse request
    const body = await request.json()
    const { organizerId, payoutId, reason } = body

    if (!organizerId || !payoutId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use transaction for atomic decline
    const payoutRef = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payouts')
      .doc(payoutId)

    const result = await adminDb.runTransaction(async (transaction: any) => {
      const payoutDoc = await transaction.get(payoutRef)

      if (!payoutDoc.exists) {
        throw new Error('Payout not found')
      }

      const payoutData = payoutDoc.data()!

      // IDEMPOTENCY CHECK: Verify status is still 'pending'
      if (payoutData.status !== 'pending') {
        throw new Error(`Cannot decline - payout is already ${payoutData.status}`)
      }

      // Update payout status
      const now = new Date().toISOString()
      transaction.update(payoutRef, {
        status: 'cancelled',  // Using 'cancelled' instead of 'declined' to match Payout type
        declinedBy: adminUserId,
        declinedAt: now,
        declineReason: reason,
        updatedAt: now,
      })

      return {
        id: payoutDoc.id,
        ...payoutData,
        status: 'cancelled',
        declinedBy: adminUserId,
        declinedAt: now,
        declineReason: reason,
      }
    })

    return NextResponse.json({
      success: true,
      payout: result,
    })
  } catch (error: any) {
    console.error('Error declining payout:', error)
    return NextResponse.json(
      { error: 'Failed to decline payout', message: error.message },
      { status: 500 }
    )
  }
}
