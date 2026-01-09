import { requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import AdminVerifyClient from './AdminVerifyClient'
import { adminDb } from '@/lib/firebase/admin'

export const revalidate = 0

export const dynamic = 'force-dynamic'

function serializeFirestoreValue(value: any): any {
  if (value == null) return value

  // Firestore Timestamp (admin/client SDK) and other objects that expose toDate()
  if (typeof value?.toDate === 'function') {
    try {
      const date = value.toDate()
      if (date instanceof Date) return date.toISOString()
    } catch {
      // fall through
    }
  }

  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(serializeFirestoreValue)

  if (typeof value === 'object') {
    const output: Record<string, any> = {}
    for (const [key, val] of Object.entries(value)) {
      output[key] = serializeFirestoreValue(val)
    }
    return output
  }

  return value
}

export default async function AdminVerifyPage({
  searchParams,
}: {
  searchParams?: { status?: string }
}) {
  const { user, error } = await requireAdmin()

  if (error || !user) {
    redirect('/')
  }

  const requestedStatusRaw = (searchParams?.status || 'pending').toLowerCase()

  // Support both legacy and canonical statuses.
  const pendingStatuses = ['pending_review', 'in_review', 'in_progress', 'pending']
  const supported = new Set(['pending', 'approved', 'rejected', 'changes_requested', 'in_progress', 'all'])
  const requestedStatus = supported.has(requestedStatusRaw) ? requestedStatusRaw : 'pending'

  // Fetch a bounded set of verification requests (avoid scanning the entire collection).
  let verificationRequests: any[] = []
  try {
    let queryRef: any = adminDb.collection('verification_requests')

    if (requestedStatus === 'pending') {
      queryRef = queryRef.where('status', 'in', pendingStatuses)
    } else if (requestedStatus !== 'all') {
      queryRef = queryRef.where('status', '==', requestedStatus)
    }

    // Prefer a stable ordering (fall back if the field doesn't exist)
    try {
      queryRef = queryRef.orderBy('submitted_at', 'desc')
    } catch {
      try {
        queryRef = queryRef.orderBy('created_at', 'desc')
      } catch {
        // no-op
      }
    }

    const mapDoc = (doc: any) => {
      const data = doc.data()
      const serialized = serializeFirestoreValue(data)

      const normalizedUserId =
        serialized?.userId || serialized?.user_id || serialized?.userID || serialized?.uid || doc.id

      return {
        id: doc.id,
        ...serialized,
        userId: normalizedUserId,
        user_id: serialized?.user_id ?? serialized?.userId ?? null,
        status: serialized?.status || 'pending',
      }
    }

    const snapshot = await queryRef.limit(50).get()
    const primary = snapshot.docs.map(mapDoc)

    // If pending queue looks suspiciously small, add a bounded fallback query to catch
    // older/mismatched docs that still have submission timestamps but an unexpected status.
    if (requestedStatus === 'pending' && primary.length < 10) {
      const byId = new Map<string, any>(primary.map((r: any) => [String(r.id), r]))

      const isSubmitted = (r: any) => Boolean(r?.submittedAt || r?.submitted_at || r?.createdAt || r?.created_at)
      const isPendingLike = (r: any) => {
        const s = String(r?.status || '').toLowerCase()
        if (pendingStatuses.includes(s)) return true
        // Treat missing/unknown statuses as pending if it has a submission timestamp.
        if (!s || s === 'unknown') return isSubmitted(r)
        return false
      }

      const tryFallbackOrder = async (field: string) => {
        const snap = await adminDb.collection('verification_requests').orderBy(field, 'desc').limit(50).get()
        return snap.docs.map(mapDoc)
      }

      let fallback: any[] = []
      try {
        fallback = await tryFallbackOrder('submittedAt')
      } catch {
        try {
          fallback = await tryFallbackOrder('submitted_at')
        } catch {
          try {
            fallback = await tryFallbackOrder('createdAt')
          } catch {
            try {
              fallback = await tryFallbackOrder('created_at')
            } catch {
              fallback = []
            }
          }
        }
      }

      for (const r of fallback) {
        if (byId.has(String(r.id))) continue
        if (!isPendingLike(r)) continue
        byId.set(String(r.id), r)
      }

      verificationRequests = Array.from(byId.values()).slice(0, 50)
    } else {
      verificationRequests = primary
    }
  } catch (err) {
    console.error('Error fetching verification requests:', err)
    verificationRequests = []
  }

  // Batch-load related users (Firestore `in` supports max 10 ids per query).
  const userIds = Array.from(
    new Set(
      verificationRequests
        .map((r: any) => String(r.userId || r.user_id || r.id || '').trim())
        .filter(Boolean)
    )
  )

  const usersById = new Map<string, any>()
  try {
    const batches: Promise<any>[] = []
    for (let i = 0; i < userIds.length; i += 10) {
      const batch = userIds.slice(i, i + 10)
      batches.push(adminDb.collection('users').where('__name__', 'in', batch).get())
    }
    const snaps = await Promise.all(batches)
    for (const snap of snaps) {
      for (const doc of snap.docs) {
        usersById.set(doc.id, { id: doc.id, ...serializeFirestoreValue(doc.data()) })
      }
    }
  } catch (err) {
    console.error('Error fetching users for verification requests:', err)
  }

  const requestsWithUsers = verificationRequests.map((request: any) => {
    const userId = String(request.userId || request.user_id || request.id || '').trim()
    return {
      ...request,
      userId,
      user: usersById.get(userId) || null,
    }
  })

  // Limit organizer list for quick toggle (avoid loading all users).
  let organizers: any[] = []
  try {
    let orgQuery: any = adminDb.collection('users').where('role', '==', 'organizer')
    try {
      orgQuery = orgQuery.orderBy('created_at', 'desc')
    } catch {
      try {
        orgQuery = orgQuery.orderBy('createdAt', 'desc')
      } catch {
        // no-op
      }
    }
    const snap = await orgQuery.limit(500).get()
    organizers = snap.docs.map((doc: any) => {
      const u = serializeFirestoreValue(doc.data())
      return {
        id: doc.id,
        full_name: u.full_name,
        email: u.email,
        is_verified: Boolean(u.is_verified),
        verification_status: u.verification_status || 'none',
        created_at: u.created_at,
      }
    })
  } catch (err) {
    console.error('Error fetching organizers:', err)
    organizers = []
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={true} />
      
      <AdminVerifyClient 
        requestsWithUsers={requestsWithUsers}
        organizers={organizers}
      />
      
      <MobileNavWrapper user={user} isAdmin={true} />
    </div>
  )
}
