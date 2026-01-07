import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { isAdmin as isAdminEmail } from '@/lib/admin'
import { createClient } from '@/lib/firebase-db/server'
import { adminDb } from '@/lib/firebase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET, POST, OPTIONS',
    },
  })
}

type Body = {
  dryRun?: boolean
  limit?: number
  includeFirestore?: boolean
}

function isRoleAdmin(user: any): boolean {
  const role = String(user?.role || '').toLowerCase()
  return role === 'admin' || role === 'super_admin'
}

function isTruthy(value: unknown): boolean {
  return String(value || '').toLowerCase() === 'true'
}

export async function GET() {
  try {
    const { user, error } = await requireAuth()
    const authenticated = Boolean(!error && user)
    const admin = Boolean(authenticated && (isRoleAdmin(user) || isAdminEmail(user?.email)))

    if (!admin) {
      return NextResponse.json(
        {
          ok: false,
          error: authenticated ? 'Unauthorized' : 'Unauthorized',
          authenticated,
          admin,
          message:
            'This endpoint requires an admin session. Log in with an admin account and ensure ADMIN_EMAILS includes your email or your user role is admin/super_admin.',
          usage: {
            method: 'POST',
            url: '/api/admin/events/migrate-canada-currency',
            bodyExamples: [
              { dryRun: true, limit: 500, includeFirestore: true },
              { dryRun: false, limit: 500, includeFirestore: true },
            ],
          },
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      ok: true,
      authenticated,
      admin,
      message:
        'Use POST to migrate Canada events to CAD. Start with dryRun=true. This updates Supabase by default, and optionally Firestore when includeFirestore=true.',
    })
  } catch (err: any) {
    console.error('migrate-canada-currency GET error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user || !(isRoleAdmin(user) || isAdminEmail(user?.email))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as Body
    const dryRun = Boolean(body?.dryRun)
    const limit = Math.min(Math.max(Number(body?.limit || 500), 1), 5000)
    const includeFirestore = body?.includeFirestore === true || isTruthy(body?.includeFirestore)

    const supabase = await createClient()

    // Fetch candidate Supabase events.
    // Note: Supabase filters for NULL/empty are awkward; we pull a broader set and filter in JS.
    const { data: caEvents, error: caErr } = await supabase
      .from('events')
      .select('id,title,country,currency,ticket_price,organizer_id')
      .in('country', ['CA', 'Canada', 'CANADA', 'canada'])
      .order('id', { ascending: true })
      .limit(limit)

    if (caErr) {
      return NextResponse.json({ error: caErr.message || 'Failed to query events' }, { status: 500 })
    }

    const candidates = (caEvents || []).filter((e: any) => {
      const currency = String(e?.currency || '').trim().toUpperCase()
      return !currency || currency === 'USD'
    })

    const toUpdate = candidates.slice(0, limit)

    const updatedSupabaseIds: string[] = []
    const examples = toUpdate.slice(0, 25).map((e: any) => ({
      id: e.id,
      title: e.title,
      oldCurrency: String(e.currency || ''),
      newCurrency: 'CAD',
    }))

    if (!dryRun && toUpdate.length > 0) {
      const ids = toUpdate.map((e: any) => e.id)
      const { error: updateErr } = await supabase
        .from('events')
        .update({ currency: 'CAD' })
        .in('id', ids)

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message || 'Failed to update events' }, { status: 500 })
      }

      updatedSupabaseIds.push(...ids)
    }

    // Optional: update Firestore mirror so Discover/display stays consistent if it reads Firestore.
    let firestoreScanned = 0
    let firestoreUpdated = 0
    const firestoreExamples: Array<{ id: string; title?: string; oldCurrency?: string; newCurrency: string }> = []

    if (includeFirestore) {
      const snapshot = await adminDb
        .collection('events')
        .where('country', '==', 'CA')
        .limit(limit)
        .get()

      firestoreScanned = snapshot.size
      const batch = adminDb.batch()
      let batchOps = 0

      for (const doc of snapshot.docs) {
        const data: any = doc.data() || {}
        const current = String(data.currency || '').trim().toUpperCase()
        if (current && current !== 'USD') continue

        firestoreUpdated += 1
        if (firestoreExamples.length < 25) {
          firestoreExamples.push({
            id: doc.id,
            title: data.title,
            oldCurrency: data.currency,
            newCurrency: 'CAD',
          })
        }

        if (!dryRun) {
          batch.update(doc.ref, { currency: 'CAD', updated_at: new Date() })
          batchOps += 1
        }
      }

      if (!dryRun && batchOps > 0) {
        await batch.commit()
      }
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      limit,
      supabase: {
        scanned: (caEvents || []).length,
        candidates: candidates.length,
        updated: dryRun ? 0 : updatedSupabaseIds.length,
        examples,
      },
      firestore: includeFirestore
        ? {
            scanned: firestoreScanned,
            updated: dryRun ? 0 : firestoreUpdated,
            examples: firestoreExamples,
          }
        : { skipped: true },
      warning:
        'This migration only changes currency codes (USD→CAD) without converting prices. If you need FX conversion for existing CAD events, we should do a separate rate-based migration.',
    })
  } catch (err: any) {
    console.error('migrate-canada-currency POST error:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
