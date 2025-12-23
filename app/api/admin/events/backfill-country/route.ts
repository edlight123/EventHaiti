import { NextRequest, NextResponse } from 'next/server'
import { FieldPath } from 'firebase-admin/firestore'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { adminDb } from '@/lib/firebase/admin'
import { resolveEventCountry } from '@/lib/event-country'
import { normalizeCountryCode } from '@/lib/payment-provider'

export const runtime = 'nodejs'

type BackfillRequest = {
  dryRun?: boolean
  // If true, only backfill events that are publicly visible.
  // We treat either `is_published === true` OR `status === 'published'` as published.
  onlyPublished?: boolean
  // Max number of documents to scan in this call.
  limit?: number
  // Pagination cursor: last processed event id (document id).
  startAfterId?: string
}

export async function GET() {
  try {
    const { user, error } = await requireAuth()
    const authenticated = Boolean(!error && user)
    const admin = Boolean(authenticated && isAdmin(user?.email))

    if (!admin) {
      return NextResponse.json(
        {
          ok: false,
          error: authenticated ? 'Unauthorized' : 'Unauthorized',
          authenticated,
          admin,
          message:
            'This endpoint requires an admin session. Log in with an admin account and ensure ADMIN_EMAILS includes your email.',
          usage: {
            method: 'POST',
            url: '/api/admin/events/backfill-country',
            bodyExamples: [
              { dryRun: true, onlyPublished: true, limit: 500 },
              { dryRun: false, onlyPublished: true, limit: 500 },
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
        'Use POST to run the backfill. Start with dryRun=true. For pagination, pass startAfterId from the previous response.',
      usage: {
        method: 'POST',
        url: '/api/admin/events/backfill-country',
        bodyExamples: [
          { dryRun: true, onlyPublished: true, limit: 500 },
          { dryRun: false, onlyPublished: true, limit: 500 },
          { dryRun: true, onlyPublished: false, limit: 500, startAfterId: 'lastDocIdFromPreviousRun' },
        ],
      },
    })
  } catch (err: any) {
    console.error('Backfill country GET error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user || !isAdmin(user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as BackfillRequest

    const dryRun = Boolean(body?.dryRun)
    const onlyPublished = Boolean(body?.onlyPublished)
    const limit = Math.min(Math.max(Number(body?.limit || 500), 1), 5000)
    const startAfterId = String(body?.startAfterId || '').trim()

    const pageSize = Math.min(limit, 500)

    let query = adminDb
      .collection('events')
      .orderBy(FieldPath.documentId())
      .limit(pageSize)

    if (startAfterId) {
      query = query.startAfter(startAfterId)
    }

    const snapshot = await query.get()

    let scanned = 0
    let updated = 0
    let skipped = 0
    let unable = 0

    const examples: Array<{
      id: string
      oldCountry: string
      newCountry: string
      title?: string
      dryRun: boolean
    }> = []

    const batch = adminDb.batch()
    let batchOps = 0

    for (const doc of snapshot.docs) {
      scanned += 1
      const data: any = doc.data() || {}

      if (onlyPublished) {
        const isPublic = Boolean(data.is_published || data.status === 'published')
        if (!isPublic) {
          skipped += 1
          continue
        }
      }

      const existingCountry = normalizeCountryCode(data.country)
      if (existingCountry) {
        skipped += 1
        continue
      }

      const resolvedCountry = await resolveEventCountry({ ...data, id: doc.id })

      if (!resolvedCountry) {
        unable += 1
        continue
      }

      updated += 1

      if (examples.length < 25) {
        examples.push({
          id: doc.id,
          oldCountry: existingCountry,
          newCountry: resolvedCountry,
          title: data.title,
          dryRun,
        })
      }

      if (!dryRun) {
        batch.update(doc.ref, {
          country: resolvedCountry,
          updated_at: new Date(),
        })
        batchOps += 1
      }
    }

    if (!dryRun && batchOps > 0) {
      await batch.commit()
    }

    const lastId = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null

    return NextResponse.json({
      success: true,
      dryRun,
      onlyPublished,
      scanned,
      updated,
      skipped,
      unable,
      lastId,
      examples,
      next: lastId && scanned < limit ? { startAfterId: lastId } : null,
    })
  } catch (err: any) {
    console.error('Backfill country error:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
