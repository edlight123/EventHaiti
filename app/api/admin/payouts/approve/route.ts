import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/auth'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { logAdminAction } from '@/lib/admin/audit-log'

/**
 * Approve a payout request (admin only)
 * 
 * IDEMPOTENCY: Uses Firestore transaction to prevent double-approval
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin()
    if (error || !user) return adminError('Unauthorized', 401)

    // Parse request
    const body = await request.json()
    const { organizerId, payoutId } = body

    if (!organizerId || !payoutId) {
      return adminError('Missing required fields', 400)
    }

    // Use transaction for atomic approval (prevents race conditions)
    const payoutRef = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payouts')
      .doc(payoutId)

    const result = await adminDb.runTransaction(async (transaction: any) => {
      const payoutDoc = await transaction.get(payoutRef)

      if (!payoutDoc.exists) throw new Error('Payout not found')

      const payoutData = payoutDoc.data()!

      // Idempotency: approving an already-approved payout returns success.
      if (payoutData.status === 'approved') {
        return { idempotent: true, payout: { id: payoutDoc.id, ...payoutData } }
      }

      // Concurrency-safe transition: only pending -> approved
      if (payoutData.status !== 'pending') {
        return { conflict: true, payout: { id: payoutDoc.id, ...payoutData } }
      }

      // Update payout status
      const now = new Date().toISOString()
      transaction.update(payoutRef, {
        status: 'approved',
        approvedBy: user.id,
        approvedAt: now,
        updatedAt: now,
      })

      return {
        idempotent: false,
        before: { id: payoutDoc.id, ...payoutData },
        payout: {
          id: payoutDoc.id,
          ...payoutData,
          status: 'approved',
          approvedBy: user.id,
          approvedAt: now,
        },
      }
    })

    if ((result as any)?.conflict) {
      return adminError('Invalid payout status transition', 409, `Cannot approve - payout is ${String((result as any)?.payout?.status || '')}`)
    }

    const payout = (result as any).payout
    const before = (result as any).before
    const idempotent = Boolean((result as any).idempotent)

    if (!idempotent) {
      logAdminAction({
        action: 'payout.approve',
        adminId: user.id,
        adminEmail: user.email || 'unknown',
        resourceType: 'payout',
        resourceId: `${organizerId}:${payoutId}`,
        details: {
          organizerId,
          payoutId,
          beforeStatus: before?.status,
          afterStatus: payout?.status,
        },
      }).catch(() => {})
    }

    return adminOk({ payout, idempotent })
  } catch (error: any) {
    console.error('Error approving payout:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const status = msg === 'Payout not found' ? 404 : 500
    return adminError('Failed to approve payout', status, msg)
  }
}
