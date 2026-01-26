import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAuth } from '@/lib/auth'
import { getPayoutProfile } from '@/lib/firestore/payout-profiles'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth('organizer')
    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const organizerId = user.id

    const haitiProfile = await getPayoutProfile(organizerId, 'haiti')

    if (!haitiProfile || !haitiProfile.mobileMoneyDetails) {
      return NextResponse.json(
        { error: 'Mobile money details must be configured first' },
        { status: 400 }
      )
    }

    const phoneNumber = haitiProfile.mobileMoneyDetails.phoneNumber

    // Generate 6-digit verification code using crypto for security
    const verificationCode = crypto.randomInt(100000, 1000000).toString()

    // Store verification code
    await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('verificationDocuments')
      .doc('phone')
      .set({
        type: 'phone',
        code: verificationCode,
        phoneNumber,
        status: 'pending',
        sentAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      })

    // In production, you would send SMS here using a service like Twilio
    // For demo purposes, we'll just log it
    console.log(`Verification code for ${phoneNumber}: ${verificationCode}`)

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your phone',
      // In production, DON'T send the code in the response
      // This is only for demo purposes
      debugCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined,
    })
  } catch (error: any) {
    console.error('Error sending verification code:', error)
    return NextResponse.json(
      { error: 'Failed to send verification code', message: error.message },
      { status: 500 }
    )
  }
}
