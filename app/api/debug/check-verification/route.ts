import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user || !isAdmin(user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    // Find user by email
    const usersSnapshot = await adminDb
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get()

    if (usersSnapshot.empty) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userDoc = usersSnapshot.docs[0]
    const userId = userDoc.id
    const userData = userDoc.data()

    // Check verification_requests collection
    const verificationRequestDoc = await adminDb
      .collection('verification_requests')
      .doc(userId)
      .get()

    // Check organizers payout config
    const payoutConfigDoc = await adminDb
      .collection('organizers')
      .doc(userId)
      .collection('payoutConfig')
      .doc('main')
      .get()

    // Check verification documents
    const verificationDocsSnapshot = await adminDb
      .collection('organizers')
      .doc(userId)
      .collection('verificationDocuments')
      .get()

    const verificationDocs: any = {}
    verificationDocsSnapshot.docs.forEach((doc: any) => {
      verificationDocs[doc.id] = doc.data()
    })

    return NextResponse.json({
      userId,
      email,
      user: {
        role: userData.role,
        verification_status: userData.verification_status,
        full_name: userData.full_name,
      },
      verification_request: {
        exists: verificationRequestDoc.exists,
        data: verificationRequestDoc.exists ? verificationRequestDoc.data() : null,
      },
      payout_config: {
        exists: payoutConfigDoc.exists,
        data: payoutConfigDoc.exists ? payoutConfigDoc.data() : null,
      },
      verification_documents: verificationDocs,
    })
  } catch (error: any) {
    console.error('Error checking verification:', error)
    return NextResponse.json(
      { error: 'Failed to check verification', message: error.message },
      { status: 500 }
    )
  }
}
