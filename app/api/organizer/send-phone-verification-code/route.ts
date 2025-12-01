import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const organizerId = decodedClaims.uid

    // Get current payout config to get phone number
    const configDoc = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payoutConfig')
      .doc('main')
      .get()

    if (!configDoc.exists || !configDoc.data()?.mobileMoneyDetails) {
      return NextResponse.json(
        { error: 'Mobile money details must be configured first' },
        { status: 400 }
      )
    }

    const phoneNumber = configDoc.data()!.mobileMoneyDetails.phoneNumber

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

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
