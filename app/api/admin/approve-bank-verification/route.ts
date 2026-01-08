import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/auth'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { logAdminAction } from '@/lib/admin/audit-log'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin()
    if (error || !user) {
      return adminError('Not authenticated', 401)
    }

    const { organizerId, decision, reason, destinationId } = await request.json()

    if (!organizerId || !decision) {
      return adminError('Organization ID and decision are required', 400)
    }

    if (decision !== 'approve' && decision !== 'reject') {
      return adminError('Decision must be "approve" or "reject"', 400)
    }

    const newStatus = decision === 'approve' ? 'verified' : 'failed'

    const resolvedDestinationId = destinationId ? String(destinationId) : ''
    const docId = (() => {
      const normalized = resolvedDestinationId.trim()
      // Legacy primary bank verification used doc id "bank".
      if (!normalized || normalized === 'bank' || normalized === 'bank_primary' || normalized === 'primary') {
        return 'bank'
      }
      // Some callers may already provide the full verification doc id.
      if (normalized.startsWith('bank_')) return normalized
      return `bank_${normalized}`
    })()

    const verificationRef = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('verificationDocuments')
      .doc(docId)

    const txResult = await adminDb.runTransaction(async (tx: any) => {
      const snap = await tx.get(verificationRef)
      if (!snap.exists) return { notFound: true }

      const before = snap.data() as any
      const beforeStatus = String(before?.status || 'pending')

      if (beforeStatus === newStatus) {
        return { idempotent: true, beforeStatus, afterStatus: beforeStatus }
      }

      tx.update(verificationRef, {
        status: newStatus,
        reviewedAt: new Date().toISOString(),
        reviewedBy: user.id,
        rejectionReason: decision === 'reject' ? reason : null,
      })

      return { idempotent: false, beforeStatus, afterStatus: newStatus }
    })

    if ((txResult as any)?.notFound) {
      return adminError('Bank verification not found', 404)
    }

    const idempotent = Boolean((txResult as any)?.idempotent)

    if (!idempotent) {
      logAdminAction({
        action: decision === 'approve' ? 'bank_verification.approve' : 'bank_verification.reject',
        adminId: user.id,
        adminEmail: user.email || 'unknown',
        resourceType: 'bank_verification',
        resourceId: `${organizerId}:${docId}`,
        details: {
          organizerId,
          destinationId,
          verificationDocId: docId,
          decision,
          reason: decision === 'reject' ? reason : null,
          beforeStatus: (txResult as any)?.beforeStatus,
          afterStatus: (txResult as any)?.afterStatus,
        },
      }).catch(() => {})
    }

    // TODO: Send email notification to organizer
    // In production, you would notify the organizer of the decision

    return adminOk({
      message: `Bank verification ${decision}d successfully`,
      status: newStatus,
      idempotent,
    })
  } catch (error: any) {
    console.error('Error processing bank verification:', error)
    return adminError('Failed to process verification', 500, error?.message)
  }
}
