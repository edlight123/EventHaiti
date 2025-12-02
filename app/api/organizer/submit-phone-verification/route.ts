import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'
import { recomputePayoutStatus } from '@/lib/firestore/payout'

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

    const { verificationCode } = await request.json()

    if (!verificationCode) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      )
    }

    // Get current payout config to ensure mobile money details exist
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

    // Check if there's a pending verification code
    const verificationDoc = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('verificationDocuments')
      .doc('phone')
      .get()

    const verificationData = verificationDoc.data()

    // In production, you would:
    // 1. Send SMS with verification code when phone number is added
    // 2. Validate the code here against what was sent
    // For demo purposes, we'll accept any 6-digit code
    if (!/^\d{6}$/.test(verificationCode)) {
      return NextResponse.json(
        { error: 'Invalid verification code format. Must be 6 digits.' },
        { status: 400 }
      )
    }

    // For demo, accept '123456' or verify against stored code
    const expectedCode = verificationData?.code || '123456'
    
    if (verificationCode !== expectedCode) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Mark phone as verified
    await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('verificationDocuments')
      .doc('phone')
      .set({
        type: 'phone',
        status: 'verified',
        verifiedAt: new Date().toISOString(),
      })

    // Update payout config verification status
    await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payoutConfig')
      .doc('main')
      .set(
        {
          'verificationStatus.phone': 'verified',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )

    await recomputePayoutStatus(organizerId)

    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully',
      status: 'verified',
    })
  } catch (error: any) {
    console.error('Error verifying phone:', error)
    return NextResponse.json(
      { error: 'Failed to verify phone', message: error.message },
      { status: 500 }
    )
  }
}
