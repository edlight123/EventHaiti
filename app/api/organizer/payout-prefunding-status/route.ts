import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    await adminAuth.verifySessionCookie(sessionCookie, true)

    const snap = await adminDb.collection('config').doc('payouts').get()
    const data = snap.exists ? snap.data() : null

    const prefunding = data?.prefunding || null

    return NextResponse.json({
      prefunding: {
        enabled: Boolean(prefunding?.enabled),
        available: Boolean(prefunding?.available),
        updatedAt: prefunding?.updatedAt?.toDate?.()?.toISOString?.() || prefunding?.updatedAt || null,
      },
    })
  } catch (error: any) {
    console.error('payout-prefunding-status error:', error)
    return NextResponse.json(
      { error: 'Failed to load prefunding status', message: error?.message || String(error) },
      { status: 500 }
    )
  }
}
