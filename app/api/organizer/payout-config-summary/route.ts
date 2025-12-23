import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'

export async function GET(_req: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const configDoc = await adminDb
      .collection('organizers')
      .doc(user.id)
      .collection('payoutConfig')
      .doc('main')
      .get()

    const data = configDoc.exists ? (configDoc.data() as any) : null

    return NextResponse.json({
      allowInstantMoncash: Boolean(data?.allowInstantMoncash),
      payoutProvider: data?.payoutProvider || null,
      method: data?.method || null,
      status: data?.status || null,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Failed to load payout config summary', message: e?.message || String(e) },
      { status: 500 }
    )
  }
}
