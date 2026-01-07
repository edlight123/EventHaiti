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

    const { organizerId, decision, reason, destinationId } = await request.json()

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

    // Update verification document
    await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('verificationDocuments')
      .doc(docId)
      .update({
        status: newStatus,
        reviewedAt: new Date().toISOString(),
        reviewedBy: user.id,
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
