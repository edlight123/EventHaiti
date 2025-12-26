import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'

/**
 * Mark a payout as paid (admin only)
 * 
 * REQUIRED: paymentReferenceId must be provided (bank transfer ID or MonCash transaction ID)
 * IDEMPOTENCY: Uses Firestore transaction to prevent marking paid twice
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
    const { organizerId, payoutId, paymentReferenceId, paymentMethod, paymentNotes } = body

    if (!organizerId || !payoutId || !paymentReferenceId) {
      return NextResponse.json(
        { error: 'Missing required fields: organizerId, payoutId, paymentReferenceId' },
        { status: 400 }
      )
    }

    // Use transaction for atomic update
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

      // IDEMPOTENCY CHECK: Verify status is 'pending' or 'approved', not already 'completed'
      if (payoutData.status === 'completed') {
        throw new Error('Payout is already marked as paid')
      }

      if (payoutData.status !== 'pending' && payoutData.status !== 'approved') {
        throw new Error(`Cannot mark paid - payout is ${payoutData.status}`)
      }

      // Update payout to completed
      const now = new Date().toISOString()
      transaction.update(payoutRef, {
        status: 'completed',
        completedAt: now,
        processedDate: now,
        paymentReferenceId,
        paymentMethod: paymentMethod || payoutData.method,
        paymentNotes: paymentNotes || '',
        updatedAt: now,
      })

      return {
        id: payoutDoc.id,
        ...payoutData,
        status: 'completed',
        completedAt: now,
        processedDate: now,
        paymentReferenceId,
        paymentMethod: paymentMethod || payoutData.method,
        paymentNotes,
      }
    })

    return NextResponse.json({
      success: true,
      payout: result,
    })
  } catch (error: any) {
    console.error('Error marking payout as paid:', error)
    return NextResponse.json(
      { error: 'Failed to mark payout as paid', message: error.message },
      { status: 500 }
    )
  }
}
