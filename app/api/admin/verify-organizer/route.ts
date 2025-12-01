import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'

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

    const supabase = await createClient()

    // Get current user data
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', organizerId)
      .single()

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update user verification status using Firebase Admin SDK for reliability
    try {
      const { adminDb } = await import('@/lib/firebase/admin')
      await adminDb.collection('users').doc(organizerId).set({
        ...userData,
        is_verified: isVerified,
        verification_status: isVerified ? 'approved' : 'none',
        updated_at: new Date().toISOString()
      }, { merge: true })
    } catch (error) {
      console.error('Error updating user via Admin SDK:', error)
      return NextResponse.json(
        { error: 'Failed to update user verification' },
        { status: 500 }
      )
    }

    // Also update or create verification request if exists
    const { data: existingRequest } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('id', organizerId)
      .single()

    if (existingRequest) {
      try {
        const { adminDb } = await import('@/lib/firebase/admin')
        await adminDb.collection('verification_requests').doc(organizerId).set({
          ...existingRequest,
          status: isVerified ? 'approved' : 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date(),
          updated_at: new Date()
        }, { merge: true })
      } catch (error) {
        console.error('Error updating verification request:', error)
      }
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
