import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user || !isAdmin(user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const enabled = Boolean(body?.enabled)
    const available = Boolean(body?.available)

    await adminDb.collection('config').doc('payouts').set(
      {
        prefunding: {
          enabled,
          available,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: user.id,
        },
      },
      { merge: true }
    )

    return NextResponse.json({ success: true, prefunding: { enabled, available } })
  } catch (error: any) {
    console.error('admin payout-prefunding error:', error)
    return NextResponse.json(
      { error: 'Failed to update prefunding status', message: error?.message || String(error) },
      { status: 500 }
    )
  }
}
