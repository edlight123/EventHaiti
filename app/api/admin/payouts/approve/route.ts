import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'

/**
 * Approve a payout request (admin only)
 * 
 * IDEMPOTENCY: Uses Firestore transaction to prevent double-approval
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const adminUserId = user.id

    // Parse request
    const body = await request.json()
    const { organizerId, payoutId } = body

    if (!organizerId || !payoutId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use transaction for atomic approval (prevents race conditions)
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
        throw new Error(`Cannot approve - payout is already ${payoutData.status}`)
      }

      // Update payout status
      const now = new Date().toISOString()
      transaction.update(payoutRef, {
        status: 'approved',
        approvedBy: adminUserId,
        approvedAt: now,
        updatedAt: now,
      })

      return {
        id: payoutDoc.id,
        ...payoutData,
        status: 'approved',
        approvedBy: adminUserId,
        approvedAt: now,
      }
    })

    return NextResponse.json({
      success: true,
      payout: result,
    })
  } catch (error: any) {
    console.error('Error approving payout:', error)
    return NextResponse.json(
      { error: 'Failed to approve payout', message: error.message },
      { status: 500 }
    )
  }
}
