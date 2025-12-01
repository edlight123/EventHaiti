import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { Resend } from 'resend'
import { adminDb } from '@/lib/firebase/admin'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
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

    const { requestId, status, rejectionReason } = await request.json()

    if (!requestId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get verification request
    const verificationRef = adminDb.collection('verification_requests').doc(requestId)
    const verificationDoc = await verificationRef.get()

    if (!verificationDoc.exists) {
      return NextResponse.json(
        { error: 'Verification request not found' },
        { status: 404 }
      )
    }

    const verificationRequest = verificationDoc.data()

    // Update verification request using Firebase Admin SDK
    await verificationRef.update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date(),
      updated_at: new Date(),
      rejection_reason: status === 'rejected' ? rejectionReason : null,
    })

    console.log(`Updated verification request ${requestId} to status: ${status}`)

    // Update user verification status
    // Handle both old format (user_id) and new format (userId or document ID)
    const userId = verificationRequest.userId || verificationRequest.user_id || requestId
    const allUsers = await supabase.from('users').select('*')
    const userToUpdate = allUsers.data?.find((u: any) => u.id === userId)

    if (!userToUpdate) {
      console.error('User not found:', userId)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('Updating user:', userId)
    console.log('Current user data:', userToUpdate)
    console.log('New verification status:', status)

    // Update the user document directly using Firebase Admin SDK
    const updatePayload = {
      ...userToUpdate,
      is_verified: status === 'approved',
      verification_status: status,
      updated_at: new Date().toISOString(),
    }
    
    console.log('Update payload:', updatePayload)

    try {
      // Use Firebase Admin SDK directly to ensure the update works
      await adminDb.collection('users').doc(userId).set(updatePayload, { merge: true })
      console.log('User updated successfully via Admin SDK')
    } catch (adminError) {
      console.error('Error updating user via Admin SDK:', adminError)
      return NextResponse.json(
        { error: 'Failed to update user status' },
        { status: 500 }
      )
    }

    // Get user details for email (we already have it from above)
    const organizer = userToUpdate

    // Send notification email to organizer
    if (organizer?.email && resend) {
      try {
        if (status === 'approved') {
          await resend.emails.send({
            from: 'EventHaiti <noreply@eventhaiti.com>',
            to: organizer.email,
            subject: '✅ Your EventHaiti Account is Verified!',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #059669;">🎉 Congratulations!</h1>
                <p>Hello ${organizer.full_name},</p>
                <p>Great news! Your identity verification has been <strong>approved</strong>.</p>
                <p>You can now:</p>
                <ul>
                  <li>✅ Create and publish events</li>
                  <li>✅ Display a verified badge on your events</li>
                  <li>✅ Access all organizer features</li>
                </ul>
                <p>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/organizer/events/new" 
                     style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">
                    Create Your First Event
                  </a>
                </p>
                <p style="margin-top: 40px;">Thank you for being part of the EventHaiti community!</p>
              </div>
            `,
          })
        } else {
          await resend.emails.send({
            from: 'EventHaiti <noreply@eventhaiti.com>',
            to: organizer.email,
            subject: 'EventHaiti Verification Update',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #DC2626;">Verification Not Approved</h1>
                <p>Hello ${organizer.full_name},</p>
                <p>Unfortunately, we were unable to approve your verification request.</p>
                ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
                <p>Please submit a new verification request with:</p>
                <ul>
                  <li>Clear, well-lit photos</li>
                  <li>All text on ID card clearly visible</li>
                  <li>Face clearly visible in selfie</li>
                </ul>
                <p>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/organizer/verify" 
                     style="background-color: #0F766E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">
                    Try Again
                  </a>
                </p>
              </div>
            `,
          })
        }
      } catch (emailError) {
        console.error('Error sending notification email:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Verification ${status}`,
    })
  } catch (error) {
    console.error('Review verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
