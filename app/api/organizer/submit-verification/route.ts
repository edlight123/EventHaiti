import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId, idFrontImage, idBackImage, faceImage } = await request.json()

    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!idFrontImage || !idBackImage || !faceImage) {
      return NextResponse.json(
        { error: 'Missing verification images' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // In a production environment, you would:
    // 1. Upload images to Firebase Storage
    // 2. Store the URLs in the database
    // 3. Optionally use AI/ML for automatic verification
    // For now, we'll store base64 images directly (not recommended for production)

    // Create verification request
    const { data: verificationRequest, error: requestError } = await supabase
      .from('verification_requests')
      .insert({
        user_id: userId,
        id_front_url: idFrontImage.substring(0, 500), // Truncate for demo
        id_back_url: idBackImage.substring(0, 500),
        face_photo_url: faceImage.substring(0, 500),
        status: 'pending',
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error creating verification request:', requestError)
      return NextResponse.json(
        { error: 'Failed to create verification request' },
        { status: 500 }
      )
    }

    // Update user verification status to pending
    const { error: updateError } = await supabase
      .from('users')
      .update({ verification_status: 'pending' })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user status:', updateError)
    }

    // TODO: Send notification to admin team for review
    // TODO: Send confirmation email to user

    return NextResponse.json({
      success: true,
      message: 'Verification request submitted successfully',
      requestId: verificationRequest.id,
    })
  } catch (error) {
    console.error('Verification submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
