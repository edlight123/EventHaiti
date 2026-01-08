import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { adminError, adminOk } from '@/lib/api/admin-response'

export const dynamic = 'force-dynamic'

type QueryDoc = FirebaseFirestore.QueryDocumentSnapshot

type ParsedDate = {
  valid: boolean
  iso: string | null
  ms: number | null
  rawType: string
}

function parseDate(value: unknown): ParsedDate {
  const rawType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
  if (!value) return { valid: false, iso: null, ms: null, rawType }

  const asAny = value as any

  // Firestore Timestamp (admin SDK)
  if (asAny?.toDate && typeof asAny.toDate === 'function') {
    try {
      const d: Date = asAny.toDate()
      const ms = d.getTime()
      return Number.isFinite(ms)
        ? { valid: true, iso: d.toISOString(), ms, rawType: 'firestore.Timestamp' }
        : { valid: false, iso: null, ms: null, rawType: 'firestore.Timestamp' }
    } catch {
      return { valid: false, iso: null, ms: null, rawType: 'firestore.Timestamp' }
    }
  }

  if (value instanceof Date) {
    const ms = value.getTime()
    return Number.isFinite(ms)
      ? { valid: true, iso: value.toISOString(), ms, rawType: 'Date' }
      : { valid: false, iso: null, ms: null, rawType: 'Date' }
  }

  if (typeof value === 'number') {
    const d = new Date(value)
    const ms = d.getTime()
    return Number.isFinite(ms)
      ? { valid: true, iso: d.toISOString(), ms, rawType: 'number' }
      : { valid: false, iso: null, ms: null, rawType: 'number' }
  }

  // Serialized timestamp shapes
  if (typeof value === 'object') {
    const seconds =
      typeof asAny?._seconds === 'number'
        ? asAny._seconds
        : typeof asAny?.seconds === 'number'
          ? asAny.seconds
          : null
    if (seconds !== null) {
      const d = new Date(seconds * 1000)
      const ms = d.getTime()
      return Number.isFinite(ms)
        ? { valid: true, iso: d.toISOString(), ms, rawType: 'timestamp.seconds' }
        : { valid: false, iso: null, ms: null, rawType: 'timestamp.seconds' }
    }
  }

  if (typeof value === 'string') {
    const d = new Date(value)
    const ms = d.getTime()
    return Number.isFinite(ms)
      ? { valid: true, iso: d.toISOString(), ms, rawType: 'string' }
      : { valid: false, iso: null, ms: null, rawType: 'string' }
  }

  return { valid: false, iso: null, ms: null, rawType }
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin()

    if (error || !user) {
      return adminError(error || 'Unauthorized', 401)
    }

    const url = new URL(request.url)
    const limitRaw = url.searchParams.get('limit')
    const limit = Math.max(1, Math.min(500, Number(limitRaw || 50) || 50))

    const now = new Date()
    const nowMs = now.getTime()

    const snap = await adminDb.collection('events').orderBy('created_at', 'desc').limit(limit).get()

    const results = snap.docs.map((doc: QueryDoc) => {
      const data = doc.data() as any

      const isPublished =
        data?.is_published === true ||
        data?.isPublished === true ||
        String(data?.status || '').toLowerCase() === 'published'

      const start = parseDate(data?.start_datetime ?? data?.startDateTime)
      const end = parseDate(data?.end_datetime ?? data?.endDateTime)

      const timeOk = (() => {
        if (end.valid && end.ms !== null) return end.ms >= nowMs
        if (start.valid && start.ms !== null) return start.ms >= nowMs
        return false
      })()

      const reasons: string[] = []
      if (!isPublished) reasons.push('not_published')
      if (!start.valid && !end.valid) reasons.push('invalid_dates')
      if (isPublished && (start.valid || end.valid) && !timeOk) reasons.push('ended')

      const visibleOnDiscover = isPublished && timeOk

      return {
        id: doc.id,
        title: data?.title || null,
        is_published: data?.is_published ?? null,
        status: data?.status ?? null,
        start_datetime: start,
        end_datetime: end,
        visibleOnDiscover,
        reasons,
      }
    })

    return adminOk({
      now: now.toISOString(),
      limit,
      count: results.length,
      visibleCount: results.filter((r: any) => r.visibleOnDiscover).length,
      events: results,
    })
  } catch (e: any) {
    console.error('debug/events/visibility failed:', e)
    return adminError('Internal server error', 500)
  }
}
