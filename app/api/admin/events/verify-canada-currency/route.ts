import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { isAdmin as isAdminEmail } from '@/lib/admin'
import { adminDb } from '@/lib/firebase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isRoleAdmin(user: any): boolean {
  const role = String(user?.role || '').toLowerCase()
  return role === 'admin' || role === 'super_admin'
}

export async function GET() {
  try {
    const { user, error } = await requireAuth()
    if (error || !user || !(isRoleAdmin(user) || isAdminEmail(user?.email))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch a few Canada events directly from Firestore to verify currency
    const snapshot = await adminDb
      .collection('events')
      .where('country', '==', 'CA')
      .limit(10)
      .get()

    const events = snapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title,
        country: data.country,
        currency: data.currency,
        ticket_price: data.ticket_price,
      }
    })

    return NextResponse.json({
      ok: true,
      count: events.length,
      events,
      message: 'Direct Firestore query bypassing all caches',
    })
  } catch (err: any) {
    console.error('verify-canada-currency error:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
