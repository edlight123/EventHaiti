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
    const idType = formData.get('idType') as string
    const frontImage = formData.get('frontImage') as File
    const backImage = formData.get('backImage') as File | null

    if (!idType || !frontImage) {
      return NextResponse.json(
        { error: 'ID type and front image are required' },
        { status: 400 }
      )
    }

    // For passport, back image is not required
    if (idType !== 'passport' && !backImage) {
      return NextResponse.json(
        { error: 'Back image is required for this ID type' },
        { status: 400 }
      )
    }

    // In production, you would:
    // 1. Upload images to Firebase Storage
    // 2. Generate secure URLs
    // 3. Store verification request in Firestore
    
    // For now, create a verification request document
    const verificationRef = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('verificationDocuments')
      .doc('identity')

    const verificationData = {
      type: 'identity',
      idType,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      // In production, these would be Storage URLs
      frontImageName: frontImage.name,
      backImageName: backImage?.name || null,
      frontImageSize: frontImage.size,
      backImageSize: backImage?.size || null,
    }

    await verificationRef.set(verificationData)

    return NextResponse.json({
      success: true,
      message: 'Identity verification submitted successfully. Awaiting admin review.',
      status: 'pending',
    })
  } catch (error: any) {
    console.error('Error submitting identity verification:', error)
    return NextResponse.json(
      { error: 'Failed to submit verification', message: error.message },
      { status: 500 }
    )
  }
}
