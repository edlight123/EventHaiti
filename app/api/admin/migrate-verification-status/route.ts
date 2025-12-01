import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { adminDb } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()

    if (error || !user || !isAdmin(user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Fetching verification requests with status "pending"...')
    
    const snapshot = await adminDb
      .collection('verification_requests')
      .where('status', '==', 'pending')
      .get()

    console.log(`Found ${snapshot.size} verification requests with status "pending"`)

    // Update each document
    const batch = adminDb.batch()
    let count = 0

    snapshot.docs.forEach((doc: any) => {
      console.log(`Updating ${doc.id} to status "pending_review"`)
      batch.update(doc.ref, { status: 'pending_review' })
      count++
    })

    if (count > 0) {
      await batch.commit()
      console.log(`✅ Successfully updated ${count} verification requests to "pending_review"`)
    }

    // Also check users table for pending verification status
    console.log('Fetching users with verification_status "pending"...')
    const usersSnapshot = await adminDb
      .collection('users')
      .where('verification_status', '==', 'pending')
      .get()

    console.log(`Found ${usersSnapshot.size} users with verification_status "pending"`)

    let userCount = 0
    if (usersSnapshot.size > 0) {
      const userBatch = adminDb.batch()

      usersSnapshot.docs.forEach((doc: any) => {
        console.log(`Updating user ${doc.id} to verification_status "pending_review"`)
        userBatch.update(doc.ref, { verification_status: 'pending_review' })
        userCount++
      })

      await userBatch.commit()
      console.log(`✅ Successfully updated ${userCount} users to verification_status "pending_review"`)
    }

    return NextResponse.json({
      success: true,
      verificationsUpdated: count,
      usersUpdated: userCount,
      message: `Updated ${count} verification requests and ${userCount} users`
    })

  } catch (error) {
    console.error('Error migrating verification statuses:', error)
    return NextResponse.json({ 
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
