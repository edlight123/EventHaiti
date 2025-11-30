/**
 * Reset Verification Request
 * Deletes the existing verification request so a new one will be created with updated structure
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    // Get the authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Verify the token
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Delete the existing verification request
    await adminDb.collection('verification_requests').doc(userId).delete()

    return NextResponse.json({ 
      success: true, 
      message: 'Verification request reset. Please refresh the page.' 
    })
  } catch (error: any) {
    console.error('Error resetting verification:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reset verification' },
      { status: 500 }
    )
  }
}
