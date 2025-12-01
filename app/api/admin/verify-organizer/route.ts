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

    // Update user verification status
    const { error } = await supabase
      .from('users')
      .update({ 
        is_verified: isVerified,
        verification_status: isVerified ? 'approved' : 'none'
      })
      .eq('id', organizerId)

    if (error) {
      console.error('Error updating verification:', error)
      return NextResponse.json(
        { error: 'Failed to update verification' },
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
      await supabase
        .from('verification_requests')
        .update({
          status: isVerified ? 'approved' : 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', organizerId)
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
