import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'
import { notifyAdminsOfVerificationSubmission } from '@/lib/notifications/payout-verification'

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]

function validateFile(file: File, context: string): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `${context} exceeds maximum size of 10MB (${(file.size / 1024 / 1024).toFixed(2)}MB provided)`,
    }
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `${context} has invalid type '${file.type}'. Allowed types: JPEG, PNG, WebP, HEIC, PDF`,
    }
  }

  return { valid: true }
}

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

    // Validate front image
    const frontValidation = validateFile(frontImage, 'Front ID image')
    if (!frontValidation.valid) {
      return NextResponse.json({ error: frontValidation.error }, { status: 400 })
    }

    // Validate back image if provided
    if (backImage) {
      const backValidation = validateFile(backImage, 'Back ID image')
      if (!backValidation.valid) {
        return NextResponse.json({ error: backValidation.error }, { status: 400 })
      }
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

    // Notify admins of new verification submission
    try {
      const userDoc = await adminDb.collection('users').doc(organizerId).get()
      const organizerName = userDoc.exists ? (userDoc.data() as any)?.full_name || (userDoc.data() as any)?.email || 'Organizer' : 'Organizer'
      await notifyAdminsOfVerificationSubmission({
        organizerId,
        organizerName,
        verificationType: 'identity',
      })
    } catch (notifError) {
      console.error('Failed to send admin notification:', notifError)
      // Don't fail the request if notification fails
    }

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
