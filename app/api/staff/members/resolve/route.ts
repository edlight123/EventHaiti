import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { assertEventOwner } from '@/app/api/staff/_utils'

type ResolvedProfile = {
  uid: string
  email: string | null
  full_name: string | null
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const eventId = String(body?.eventId || '')
    const uidsRaw = Array.isArray(body?.uids) ? body.uids : []
    const uids: string[] = Array.from(
      new Set(
        uidsRaw
          .map((v: any) => String(v || '').trim())
          .filter((v: string) => Boolean(v))
      )
    )

    if (!eventId) return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    if (uids.length === 0) return NextResponse.json({ profiles: {} })

    await assertEventOwner({ eventId, uid: user.id })

    const profilesArr: ResolvedProfile[] = await Promise.all(
      uids.map(async (uid: string) => {
        const [authRecord, userDoc] = await Promise.all([
          adminAuth
            .getUser(uid)
            .catch(() => null),
          adminDb
            .collection('users')
            .doc(uid)
            .get()
            .catch(() => null),
        ])

        const email = authRecord?.email ? String(authRecord.email).toLowerCase() : null
        const full_name = userDoc?.exists ? (userDoc.data() as any)?.full_name || null : null

        return { uid, email, full_name: full_name ? String(full_name) : null }
      })
    )

    const profiles = profilesArr.reduce<Record<string, Omit<ResolvedProfile, 'uid'>>>((acc, p) => {
      acc[p.uid] = { email: p.email, full_name: p.full_name }
      return acc
    }, {})

    return NextResponse.json({ profiles })
  } catch (err: any) {
    const message = err?.message || 'Failed to resolve member profiles'
    const status = message === 'Event not found' ? 404 : message.includes('Only the event owner') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
