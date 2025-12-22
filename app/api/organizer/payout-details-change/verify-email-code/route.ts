import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import crypto from 'crypto'

const DOC_ID = 'payoutDetailsChangeVerification'
const CODE_TTL_MS = 10 * 60 * 1000

const getRef = (organizerId: string) =>
  adminDb
    .collection('organizers')
    .doc(organizerId)
    .collection('security')
    .doc(DOC_ID)

const toIso = (value: any): string | null => {
  if (!value) return null
  if (value?.toDate && typeof value.toDate === 'function') return value.toDate().toISOString()
  if (typeof value === 'string') return value
  try {
    return new Date(value).toISOString()
  } catch {
    return null
  }
}

const hashCode = (salt: string, code: string) =>
  crypto
    .createHash('sha256')
    .update(`${salt}:${code}`)
    .digest('hex')

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const organizerId = decodedClaims.uid

    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 })
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid verification code format. Must be 6 digits.' },
        { status: 400 }
      )
    }

    const ref = getRef(organizerId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'No pending verification found' }, { status: 400 })
    }

    const data = snap.data() as any
    const expiresAtIso = toIso(data?.expiresAt)
    const nowMs = Date.now()

    if (!expiresAtIso) {
      return NextResponse.json({ error: 'No pending verification found' }, { status: 400 })
    }

    const expiresAtMs = new Date(expiresAtIso).getTime()
    if (!Number.isFinite(expiresAtMs) || expiresAtMs < nowMs) {
      return NextResponse.json({ error: 'Verification code expired' }, { status: 400 })
    }

    const salt = String(data?.salt || '')
    const expectedHash = String(data?.codeHash || '')
    if (!salt || !expectedHash) {
      return NextResponse.json({ error: 'No pending verification found' }, { status: 400 })
    }

    const actualHash = hashCode(salt, code)
    if (actualHash !== expectedHash) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    const verifiedUntil = new Date(nowMs + CODE_TTL_MS).toISOString()

    await ref.set(
      {
        verifiedAt: new Date().toISOString(),
        verifiedUntil,
        // clear one-time code material
        codeHash: null,
        salt: null,
        expiresAt: null,
      },
      { merge: true }
    )

    return NextResponse.json({
      success: true,
      message: 'Verified',
      verifiedUntil,
    })
  } catch (error: any) {
    console.error('Error verifying payout change email code:', error)
    return NextResponse.json(
      { error: 'Failed to verify code', message: error?.message },
      { status: 500 }
    )
  }
}
