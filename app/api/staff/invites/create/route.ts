import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import {
  assertEventOwner,
  expiresIn48h,
  InviteMethod,
  inviteUrlFor,
  normalizePermissions,
  randomToken,
  sha256Hex,
  serverTimestamp,
} from '@/app/api/staff/_utils'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth('organizer')
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const eventId = String(body?.eventId || '')
    const method = String(body?.method || '') as InviteMethod
    const targetEmail = body?.targetEmail ? String(body.targetEmail).toLowerCase() : undefined
    const targetPhone = body?.targetPhone ? String(body.targetPhone) : undefined

    if (!eventId) return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    if (method !== 'email' && method !== 'phone' && method !== 'link') {
      return NextResponse.json({ error: 'Invalid method' }, { status: 400 })
    }
    if (method === 'email' && !targetEmail) {
      return NextResponse.json({ error: 'targetEmail is required for email invites' }, { status: 400 })
    }
    if (method === 'phone' && !targetPhone) {
      return NextResponse.json({ error: 'targetPhone is required for phone invites' }, { status: 400 })
    }

    await assertEventOwner({ eventId, uid: user.id })

    const token = randomToken(32)
    const tokenHash = sha256Hex(token)

    const expiresAt = expiresIn48h()
    const inviteRef = adminDb.collection('events').doc(eventId).collection('invites').doc()

    await inviteRef.set({
      tokenHash,
      method,
      targetEmail: method === 'email' ? targetEmail : null,
      targetPhone: method === 'phone' ? targetPhone : null,
      role: 'staff',
      permissions: normalizePermissions(body?.permissions),
      expiresAt,
      revokedAt: null,
      usedAt: null,
      usedBy: null,
      createdAt: serverTimestamp(),
      createdBy: user.id,
    })

    const inviteUrl = inviteUrlFor(eventId, token)

    return NextResponse.json({
      inviteId: inviteRef.id,
      inviteUrl,
      expiresAt: expiresAt.toDate().toISOString(),
    })
  } catch (err: any) {
    const message = err?.message || 'Failed to create invite'
    const status = message === 'Event not found' ? 404 : message.includes('Only the event owner') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
