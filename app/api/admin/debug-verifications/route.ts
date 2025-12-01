import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { adminDb } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()

    if (error || !user || !isAdmin(user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all verification requests
    const snapshot = await adminDb
      .collection('verification_requests')
      .get()

    const verifications = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    }))

    return NextResponse.json({
      total: verifications.length,
      verifications,
      statusCounts: {
        pending: verifications.filter((v: any) => v.status === 'pending').length,
        pending_review: verifications.filter((v: any) => v.status === 'pending_review').length,
        in_review: verifications.filter((v: any) => v.status === 'in_review').length,
        approved: verifications.filter((v: any) => v.status === 'approved').length,
        rejected: verifications.filter((v: any) => v.status === 'rejected').length,
      }
    })

  } catch (error) {
    console.error('Error fetching verification requests:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
