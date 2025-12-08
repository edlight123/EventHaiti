import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin'
import { isAdmin } from '@/lib/admin'

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.headers.get('authorization')?.split('Bearer ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check if user is admin
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    if (!isAdmin(userData?.email)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const payoutId = formData.get('payoutId') as string
    const organizerId = formData.get('organizerId') as string

    if (!file || !payoutId || !organizerId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, payoutId, organizerId' },
        { status: 400 }
      )
    }

    // Validate file
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Must be JPG, PNG, WebP, or PDF' },
        { status: 400 }
      )
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Verify payout exists
    const payoutRef = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payouts')
      .doc(payoutId)

    const payoutDoc = await payoutRef.get()
    if (!payoutDoc.exists) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `payout-receipts/${organizerId}/${payoutId}/${timestamp}.${fileExtension}`

    // Upload to Firebase Storage
    const bucket = adminStorage.bucket()
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const storageFile = bucket.file(fileName)

    await storageFile.save(fileBuffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
          payoutId,
          organizerId
        }
      }
    })

    // Make file publicly accessible
    await storageFile.makePublic()

    // Get public URL
    const receiptUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`

    // Update payout document with receipt info
    await payoutRef.update({
      receiptUrl,
      receiptUploadedBy: userId,
      receiptUploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      receiptUrl,
      message: 'Receipt uploaded successfully'
    })

  } catch (error: any) {
    console.error('Receipt upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload receipt' },
      { status: 500 }
    )
  }
}

// Delete receipt
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.headers.get('authorization')?.split('Bearer ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check if user is admin
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    if (!isAdmin(userData?.email)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const payoutId = searchParams.get('payoutId')
    const organizerId = searchParams.get('organizerId')

    if (!payoutId || !organizerId) {
      return NextResponse.json(
        { error: 'Missing required parameters: payoutId, organizerId' },
        { status: 400 }
      )
    }

    // Get payout document
    const payoutRef = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payouts')
      .doc(payoutId)

    const payoutDoc = await payoutRef.get()
    if (!payoutDoc.exists) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
    }

    const payout = payoutDoc.data()
    if (!payout?.receiptUrl) {
      return NextResponse.json({ error: 'No receipt found' }, { status: 404 })
    }

    // Extract file path from URL
    const bucket = adminStorage.bucket()
    const urlParts = payout.receiptUrl.split(`${bucket.name}/`)
    if (urlParts.length < 2) {
      return NextResponse.json({ error: 'Invalid receipt URL' }, { status: 400 })
    }

    const filePath = urlParts[1]

    // Delete from storage
    try {
      await bucket.file(filePath).delete()
    } catch (storageError) {
      console.error('Storage deletion error:', storageError)
      // Continue even if storage deletion fails
    }

    // Remove receipt info from payout document
    await payoutRef.update({
      receiptUrl: null,
      receiptUploadedBy: null,
      receiptUploadedAt: null,
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Receipt deleted successfully'
    })

  } catch (error: any) {
    console.error('Receipt deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete receipt' },
      { status: 500 }
    )
  }
}
