import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId, idFrontUrl, idBackUrl, facePhotoUrl } = await request.json()

    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!idFrontUrl || !idBackUrl || !facePhotoUrl) {
      return NextResponse.json(
        { error: 'Missing verification images' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Create verification request with Firebase Storage URLs
    const { data: verificationRequest, error: requestError } = await supabase
      .from('verification_requests')
      .insert({
        user_id: userId,
        id_front_url: idFrontUrl,
        id_back_url: idBackUrl,
        face_photo_url: facePhotoUrl,
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

    // Send confirmation email to user
    try {
      await resend.emails.send({
        from: 'EventHaiti <noreply@eventhaiti.com>',
        to: user.email || '',
        subject: 'Verification Request Received',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0F766E;">Verification Request Received</h1>
            <p>Hello ${user.user_metadata?.full_name || 'there'},</p>
            <p>We've received your identity verification request for EventHaiti.</p>
            <p><strong>What happens next?</strong></p>
            <ul>
              <li>Our team will review your submission within 24-48 hours</li>
              <li>You'll receive an email once your verification is complete</li>
              <li>Once verified, you'll be able to create events</li>
            </ul>
            <p>Thank you for helping us keep EventHaiti safe and trustworthy!</p>
            <p style="color: #666; font-size: 12px; margin-top: 40px;">
              If you didn't request this verification, please contact support immediately.
            </p>
          </div>
        `,
      })
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError)
      // Don't fail the request if email fails
    }

    // Send notification to admin team
    try {
      await resend.emails.send({
        from: 'EventHaiti <noreply@eventhaiti.com>',
        to: process.env.ADMIN_EMAIL || 'admin@eventhaiti.com',
        subject: 'New Verification Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0F766E;">New Verification Request</h1>
            <p>A new organizer verification request has been submitted:</p>
            <ul>
              <li><strong>Name:</strong> ${user.user_metadata?.full_name || 'N/A'}</li>
              <li><strong>Email:</strong> ${user.email}</li>
              <li><strong>Request ID:</strong> ${verificationRequest.id}</li>
            </ul>
            <p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/verify" 
                 style="background-color: #0F766E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Review Request
              </a>
            </p>
          </div>
        `,
      })
    } catch (emailError) {
      console.error('Error sending admin notification:', emailError)
    }

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
