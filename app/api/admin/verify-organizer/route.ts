import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { logAdminAction } from '@/lib/admin/audit-log'
import { adminError, adminOk } from '@/lib/api/admin-response'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin()

    // Only allow admin users
    if (error || !user) {
      return adminError(error || 'Unauthorized', 401)
    }

    const { organizerId, isVerified } = await request.json()

    if (!organizerId || typeof isVerified !== 'boolean') {
      return adminError('Invalid request data', 400)
    }

    const userDoc = await adminDb.collection('users').doc(organizerId).get()
    if (!userDoc.exists) {
      return adminError('User not found', 404)
    }

    const targetUser = userDoc.data() as any

    const nowIso = new Date().toISOString()
    const verification_status = isVerified ? 'approved' : 'none'

    // Update user + organizer profile with minimal, canonical fields.
    await adminDb.collection('users').doc(organizerId).set(
      {
        is_verified: isVerified,
        verification_status,
        updated_at: nowIso,
      },
      { merge: true }
    )

    await adminDb.collection('organizers').doc(organizerId).set(
      {
        is_verified: isVerified,
        verification_status,
        updated_at: nowIso,
      },
      { merge: true }
    )

    // If a verification request exists, keep it consistent too.
    const requestRef = adminDb.collection('verification_requests').doc(organizerId)
    const requestDoc = await requestRef.get()
    if (requestDoc.exists) {
      await requestRef.set(
        {
          status: isVerified ? 'approved' : 'not_started',
          reviewedBy: user.id,
          reviewedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          // legacy
          reviewed_by: user.id,
          reviewed_at: new Date(),
          updated_at: new Date(),
        },
        { merge: true }
      )
    }

    await logAdminAction({
      action: isVerified ? 'user.verify' : 'user.unverify',
      adminId: user.id,
      adminEmail: user.email || 'unknown',
      resourceId: organizerId,
      resourceType: 'user',
      details: {
        userEmail: targetUser?.email || null,
        userName: targetUser?.full_name || targetUser?.name || null,
        verification_status,
      },
    })

    return adminOk({
      message: `Organizer ${isVerified ? 'verified' : 'unverified'} successfully`,
    })
  } catch (error) {
    console.error('Admin verification error:', error)
    return adminError('Internal server error', 500)
  }
}
