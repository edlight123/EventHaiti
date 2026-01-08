import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/auth'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { logAdminAction } from '@/lib/admin/audit-log'

/**
 * Mark a payout as paid (admin only)
 * 
 * REQUIRED: paymentReferenceId must be provided (bank transfer ID or MonCash transaction ID)
 * IDEMPOTENCY: Uses Firestore transaction to prevent marking paid twice
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin()
    if (error || !user) return adminError('Unauthorized', 401)

    // Parse request
    const body = await request.json()
    const { organizerId, payoutId, paymentReferenceId, paymentMethod, paymentNotes } = body

    if (!organizerId || !payoutId || !paymentReferenceId) {
      return adminError('Missing required fields: organizerId, payoutId, paymentReferenceId', 400)
    }

    // Use transaction for atomic update
    const payoutRef = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payouts')
      .doc(payoutId)

    const result = await adminDb.runTransaction(async (transaction: any) => {
      const payoutDoc = await transaction.get(payoutRef)

      if (!payoutDoc.exists) throw new Error('Payout not found')

      const payoutData = payoutDoc.data()!

      // Idempotency: already completed -> return success.
      if (payoutData.status === 'completed') {
        return { idempotent: true, payout: { id: payoutDoc.id, ...payoutData } }
      }

      if (payoutData.status !== 'pending' && payoutData.status !== 'approved') {
        return { conflict: true, payout: { id: payoutDoc.id, ...payoutData } }
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
        processedBy: user.id,
        updatedAt: now,
      })

      return {
        idempotent: false,
        before: { id: payoutDoc.id, ...payoutData },
        payout: {
          id: payoutDoc.id,
          ...payoutData,
          status: 'completed',
          completedAt: now,
          processedDate: now,
          paymentReferenceId,
          paymentMethod: paymentMethod || payoutData.method,
          paymentNotes: paymentNotes || '',
          processedBy: user.id,
        },
      }
    })

    if ((result as any)?.conflict) {
      return adminError('Invalid payout status transition', 409, `Cannot mark paid - payout is ${String((result as any)?.payout?.status || '')}`)
    }

    const payout = (result as any).payout
    const before = (result as any).before
    const idempotent = Boolean((result as any).idempotent)

    if (!idempotent) {
      logAdminAction({
        action: 'payout.mark_paid',
        adminId: user.id,
        adminEmail: user.email || 'unknown',
        resourceType: 'payout',
        resourceId: `${organizerId}:${payoutId}`,
        details: {
          organizerId,
          payoutId,
          paymentReferenceId,
          paymentMethod: paymentMethod || payout?.method,
          beforeStatus: before?.status,
          afterStatus: payout?.status,
        },
      }).catch(() => {})
    }

    return adminOk({ payout, idempotent })
  } catch (error: any) {
    console.error('Error marking payout as paid:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const status = msg === 'Payout not found' ? 404 : 500
    return adminError('Failed to mark payout as paid', status, msg)
  }
}
