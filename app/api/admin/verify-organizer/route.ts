import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@eventhaiti.com').split(',')

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    // Only allow admin users
    if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { organizerId, isVerified } = await request.json()

    if (!organizerId || typeof isVerified !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const userDoc = await adminDb.collection('users').doc(organizerId).get()
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

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

    return NextResponse.json({
      success: true,
      message: `Organizer ${isVerified ? 'verified' : 'unverified'} successfully`,
    })
  } catch (error) {
    console.error('Admin verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
