import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { createNotification } from '@/lib/notifications/helpers'
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

async function resolveExistingUserId(params: {
  method: InviteMethod
  targetEmail?: string
  targetPhone?: string
}): Promise<string | null> {
  const { method, targetEmail, targetPhone } = params

  if (method === 'email' && targetEmail) {
    // Prefer Auth lookup.
    try {
      const record = await adminAuth.getUserByEmail(targetEmail)
      if (record?.uid) return record.uid
    } catch {
      // fall through
    }

    // Fallback to users collection.
    try {
      const snap = await adminDb.collection('users').where('email', '==', targetEmail).limit(1).get()
      if (!snap.empty) return snap.docs[0].id
    } catch {
      // ignore
    }
  }

  if (method === 'phone' && targetPhone) {
    const raw = String(targetPhone).trim()
    const digits = raw.replace(/[^0-9]/g, '')

    // Try a few common representations (raw, E.164-ish Haiti).
    const candidates = Array.from(
      new Set(
        [
          raw,
          digits,
          digits.length === 8 ? `+509${digits}` : null,
          digits.length === 11 && digits.startsWith('509') ? `+${digits}` : null,
          raw.startsWith('+') ? raw : null,
        ].filter(Boolean) as string[]
      )
    )

    for (const candidate of candidates) {
      try {
        const record = await adminAuth.getUserByPhoneNumber(candidate)
        if (record?.uid) return record.uid
      } catch {
        // try next
      }
    }

    // Fallback to users collection.
    try {
      const phoneCandidates = Array.from(new Set([raw, digits, ...candidates]))
      for (const phone of phoneCandidates) {
        const snap = await adminDb.collection('users').where('phone_number', '==', phone).limit(1).get()
        if (!snap.empty) return snap.docs[0].id
      }
    } catch {
      // ignore
    }
  }

  return null
}

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

    // If the invited email/phone already belongs to an existing user, also surface the invite
    // in their in-app Notifications so they can accept from there.
    if (method === 'email' || method === 'phone') {
      try {
        const existingUserId = await resolveExistingUserId({ method, targetEmail, targetPhone })

        if (existingUserId) {
          const eventSnap = await adminDb.collection('events').doc(eventId).get()
          const eventTitle = eventSnap.exists
            ? String((eventSnap.data() as any)?.title || (eventSnap.data() as any)?.name || 'an event')
            : 'an event'

          const actionUrl = `/invite?eventId=${encodeURIComponent(eventId)}&token=${encodeURIComponent(token)}`

          await createNotification(
            existingUserId,
            'staff_invite',
            'Staff invitation',
            `You have been invited to join "${eventTitle}" as staff.`,
            actionUrl,
            {
              eventId,
              inviteId: inviteRef.id,
              token,
              method,
              role: 'staff',
              permissions: normalizePermissions(body?.permissions),
              eventTitle,
            }
          )
        }
      } catch (notificationError) {
        console.error('Failed to create staff invite notification:', notificationError)
      }
    }

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
