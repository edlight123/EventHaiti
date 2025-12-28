import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { getAuthEmailPhone, sha256Hex } from '@/app/api/staff/_utils'
import { Transaction } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const eventId = String(body?.eventId || '')
    const token = String(body?.token || '')

    if (!eventId) return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

    const tokenHash = sha256Hex(token)

    const eventRef = adminDb.collection('events').doc(eventId)
    const invitesRef = eventRef.collection('invites')

    const { email: authEmail, phone: authPhone } = await getAuthEmailPhone(user.id)

    await adminDb.runTransaction(async (tx: Transaction) => {
      const inviteQuery = invitesRef.where('tokenHash', '==', tokenHash).limit(1)
      const inviteSnap = await tx.get(inviteQuery)

      if (inviteSnap.empty) {
        throw new Error('Invite not found')
      }

      const inviteDoc = inviteSnap.docs[0]
      const invite = inviteDoc.data() as any

      const expiresAt = invite?.expiresAt
      const expiresMillis = typeof expiresAt?.toMillis === 'function' ? expiresAt.toMillis() : null
      if (!expiresMillis) {
        throw new Error('Invite is invalid')
      }

      if (expiresMillis < Date.now()) {
        throw new Error('Invite expired')
      }

      if (invite?.usedAt) {
        throw new Error('Invite already claimed')
      }

      // Idempotent: declining again is still a success.
      if (invite?.revokedAt) {
        return
      }

      const method = String(invite?.method || '')

      if (method === 'email') {
        const targetEmail = invite?.targetEmail ? String(invite.targetEmail).toLowerCase() : null
        if (!authEmail || !targetEmail || authEmail !== targetEmail) {
          throw new Error('Invite email mismatch')
        }
      }

      if (method === 'phone') {
        const targetPhone = invite?.targetPhone ? String(invite.targetPhone) : null
        if (!authPhone || !targetPhone || authPhone !== targetPhone) {
          throw new Error('Invite phone mismatch')
        }
      }

      // For safety, we don't support declining anonymous link invites.
      if (method !== 'email' && method !== 'phone') {
        throw new Error('Invite method not supported')
      }

      tx.update(inviteDoc.ref, {
        revokedAt: new Date(),
        revokedBy: user.id,
        revokedReason: 'declined',
      })
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    const message = err?.message || 'Failed to decline invite'
    const status =
      message === 'Invite not found'
        ? 404
        : message === 'Invite expired'
          ? 410
          : message === 'Invite already claimed'
            ? 409
            : message === 'Invite is invalid'
              ? 412
              : message === 'Invite email mismatch' ||
                  message === 'Invite phone mismatch' ||
                  message === 'Invite method not supported'
                ? 403
                : 500

    const code =
      message === 'Invite already claimed'
        ? 'already-exists'
        : message === 'Invite expired'
          ? 'deadline-exceeded'
          : message === 'Invite email mismatch' || message === 'Invite phone mismatch'
            ? 'permission-denied'
            : message === 'Invite not found'
              ? 'not-found'
              : 'unknown'

    return NextResponse.json({ error: message, code }, { status })
  }
}
