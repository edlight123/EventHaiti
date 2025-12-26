import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/firebase-db/server'
import { isAdmin } from '@/lib/admin'
import { adminDb } from '@/lib/firebase/admin'

type NormalizedSuspiciousActivity = {
  id: string
  user_id: string | null
  activity_type: string | null
  description: string | null
  severity: 'low' | 'medium' | 'high' | 'critical' | string
  ip_address: string | null
  detected_at: string | null
  reviewed: boolean
  reviewed_by: string | null
  reviewed_at: string | null
  action_taken: string | null
}

function toIsoString(value: any): string | null {
  if (!value) return null
  if (typeof value?.toDate === 'function') {
    try {
      const d = value.toDate()
      if (d instanceof Date) return d.toISOString()
    } catch {
      return null
    }
  }
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return null
}

async function fetchSuspiciousActivitiesFromFirestore(params: {
  reviewed: string | null
  severity: string | null
  activityType: string | null
  limit: number
}): Promise<null | { activities: any[]; unreviewedCount: number; total: number }> {
  try {
    const baseSnap = await adminDb
      .collection('suspicious_activities')
      .orderBy('detected_at', 'desc')
      .limit(Math.max(1, Math.min(params.limit * 3, 200)))
      .get()

    if (baseSnap.empty) {
      return { activities: [], unreviewedCount: 0, total: 0 }
    }

    const normalized: NormalizedSuspiciousActivity[] = baseSnap.docs.map((doc: any) => {
      const data = doc.data() || {}
      const userId = data.user_id ?? data.userId ?? null
      return {
        id: doc.id,
        user_id: userId,
        activity_type: data.activity_type ?? data.activityType ?? null,
        description: data.description ?? null,
        severity: data.severity ?? 'low',
        ip_address: data.ip_address ?? data.ipAddress ?? null,
        detected_at: toIsoString(data.detected_at) ?? toIsoString(data.detectedAt) ?? null,
        reviewed: Boolean(data.reviewed),
        reviewed_by: data.reviewed_by ?? data.reviewedBy ?? null,
        reviewed_at: toIsoString(data.reviewed_at) ?? toIsoString(data.reviewedAt) ?? null,
        action_taken: data.action_taken ?? data.actionTaken ?? null,
      }
    })

    let filtered: NormalizedSuspiciousActivity[] = normalized

    if (params.reviewed !== null) {
      const reviewedBool = params.reviewed === 'true'
      filtered = filtered.filter((a: NormalizedSuspiciousActivity) => a.reviewed === reviewedBool)
    }
    if (params.severity) {
      filtered = filtered.filter((a: NormalizedSuspiciousActivity) => a.severity === params.severity)
    }
    if (params.activityType) {
      filtered = filtered.filter(
        (a: NormalizedSuspiciousActivity) => a.activity_type === params.activityType
      )
    }

    filtered = filtered.slice(0, params.limit)

    const userIds = Array.from(new Set(filtered.map((a: NormalizedSuspiciousActivity) => a.user_id).filter(Boolean)))
    const usersMap = new Map<string, { name: string; email: string }>()

    if (userIds.length > 0) {
      const batches: Array<Promise<FirebaseFirestore.QuerySnapshot>> = []
      for (let i = 0; i < userIds.length; i += 10) {
        const batch = userIds.slice(i, i + 10)
        batches.push(adminDb.collection('users').where('__name__', 'in', batch).get())
      }

      const snaps = await Promise.all(batches)
      for (const snap of snaps) {
        for (const doc of snap.docs) {
          const data = doc.data() || {}
          usersMap.set(doc.id, {
            name: data.full_name || data.name || data.email || 'Unknown',
            email: data.email || '',
          })
        }
      }
    }

    const activities = filtered.map((a: NormalizedSuspiciousActivity) => {
      const u = a.user_id ? usersMap.get(a.user_id) : null
      return {
        ...a,
        ...(u ? { users: u } : {}),
      }
    })

    let unreviewedCount = 0
    try {
      const countSnap = await adminDb
        .collection('suspicious_activities')
        .where('reviewed', '==', false)
        .count()
        .get()
      unreviewedCount = Number(countSnap.data().count || 0)
    } catch {
      const unreviewedSnap = await adminDb
        .collection('suspicious_activities')
        .where('reviewed', '==', false)
        .limit(500)
        .get()
      unreviewedCount = unreviewedSnap.size
    }

    return {
      activities,
      unreviewedCount,
      total: activities.length,
    }
  } catch (err) {
    console.warn('Firestore suspicious_activities read failed; falling back to legacy:', err)
    return null
  }
}

/**
 * Admin endpoint to view suspicious activities
 * Requires admin privileges
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const reviewed = searchParams.get('reviewed')
    const severity = searchParams.get('severity')
    const activityType = searchParams.get('activityType')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Firestore-first (migration path). If Firestore is empty/unavailable, fall back to legacy DB.
    const firestoreResult = await fetchSuspiciousActivitiesFromFirestore({
      reviewed,
      severity,
      activityType,
      limit,
    })

    if (firestoreResult && firestoreResult.total > 0) {
      return NextResponse.json({
        activities: firestoreResult.activities,
        unreviewedCount: firestoreResult.unreviewedCount,
        total: firestoreResult.total,
      })
    }

    const supabase = await createClient()

    let query = supabase
      .from('suspicious_activities')
      .select('*, users(name, email)')
      .order('detected_at', { ascending: false })
      .limit(limit)

    if (reviewed !== null) {
      query = query.eq('reviewed', reviewed === 'true')
    }

    if (severity) {
      query = query.eq('severity', severity)
    }

    if (activityType) {
      query = query.eq('activity_type', activityType)
    }

    const { data: activities, error } = await query

    if (error) {
      console.error('Error fetching suspicious activities:', error)
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      )
    }

    // Get count of unreviewed activities
    const { data: unreviewedActivities } = await supabase
      .from('suspicious_activities')
      .select('id')
      .eq('reviewed', false)

    return NextResponse.json({
      activities,
      unreviewedCount: unreviewedActivities?.length || 0,
      total: activities.length,
    })
  } catch (error) {
    console.error('Error in suspicious activities endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Mark suspicious activity as reviewed
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { activityId, actionTaken } = await req.json()

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      )
    }

    // If the activity exists in Firestore, update it there (migration path).
    const firestoreRef = adminDb.collection('suspicious_activities').doc(activityId)
    const firestoreSnap = await firestoreRef.get()
    const hasFirestore = firestoreSnap.exists

    const supabase = await createClient()

    const { error } = await supabase
      .from('suspicious_activities')
      .update({
        reviewed: true,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        action_taken: actionTaken || null,
      })
      .eq('id', activityId)

    if (hasFirestore) {
      try {
        await firestoreRef.update({
          reviewed: true,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          action_taken: actionTaken || null,
        })
      } catch (fsErr) {
        console.warn('Failed to update Firestore suspicious activity:', fsErr)
      }
    }

    if (error && !hasFirestore) {
      console.error('Error updating suspicious activity:', error)
      return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH suspicious activities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
