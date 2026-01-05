import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAuth } from '@/lib/auth'
import {
  notifyOrganizerVerificationApproved,
  notifyOrganizerVerificationRejected,
  notifyOrganizerVerificationNeedsInfo,
} from '@/lib/notifications/payout-verification'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth('admin')
    if (error || !user) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { organizerId, verificationType, documentId, status, reason } = body

    if (!organizerId || !verificationType || !documentId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['verified', 'rejected', 'needs_info'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Update verification document
    const verificationRef = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('verificationDocuments')
      .doc(documentId)

    await verificationRef.update({
      status: status === 'needs_info' ? 'pending' : status,
      reviewedAt: new Date().toISOString(),
      reviewedBy: user.id,
      reviewNotes: reason || null,
    })

    // Send appropriate notification to organizer
    const destinationId = documentId.startsWith('bank_') ? documentId.slice(5) : undefined

    if (status === 'verified') {
      await notifyOrganizerVerificationApproved({
        organizerId,
        verificationType,
        destinationId,
      })
    } else if (status === 'rejected') {
      await notifyOrganizerVerificationRejected({
        organizerId,
        verificationType,
        reason,
        destinationId,
      })
    } else if (status === 'needs_info') {
      await notifyOrganizerVerificationNeedsInfo({
        organizerId,
        verificationType,
        message: reason || 'Additional information is required for your verification.',
        destinationId,
      })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Error updating verification status:', e)
    return NextResponse.json(
      { error: 'Failed to update verification', message: e?.message || String(e) },
      { status: 500 }
    )
  }
}
