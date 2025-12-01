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

    const formData = await request.formData()
    const proofDocument = formData.get('proofDocument') as File
    const verificationType = formData.get('verificationType') as string // 'bank_statement' | 'void_check' | 'utility_bill'

    if (!proofDocument || !verificationType) {
      return NextResponse.json(
        { error: 'Proof document and verification type are required' },
        { status: 400 }
      )
    }

    // Get current payout config to ensure bank details exist
    const configDoc = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payoutConfig')
      .doc('main')
      .get()

    if (!configDoc.exists || !configDoc.data()?.bankDetails) {
      return NextResponse.json(
        { error: 'Bank account details must be configured first' },
        { status: 400 }
      )
    }

    // Create verification request document
    const verificationRef = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('verificationDocuments')
      .doc('bank')

    const verificationData = {
      type: 'bank',
      verificationType,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      // In production, this would be a Storage URL
      documentName: proofDocument.name,
      documentSize: proofDocument.size,
    }

    await verificationRef.set(verificationData)

    // Update payout config verification status
    const configRef = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payoutConfig')
      .doc('main')

    await configRef.set(
      {
        verificationStatus: {
          bank: 'pending',
        },
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )

    return NextResponse.json({
      success: true,
      message: 'Bank account verification submitted successfully',
      status: 'pending',
    })
  } catch (error: any) {
    console.error('Error submitting bank verification:', error)
    return NextResponse.json(
      { error: 'Failed to submit verification', message: error.message },
      { status: 500 }
    )
  }
}
