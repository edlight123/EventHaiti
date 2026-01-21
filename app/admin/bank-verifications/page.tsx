import { adminDb } from '@/lib/firebase/admin'
import Link from 'next/link'
import BankVerificationReviewCard from '@/components/admin/BankVerificationReviewCard'
import { getDecryptedBankDestination } from '@/lib/firestore/payout-destinations'
import { FieldPath } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PAGE_SIZE = 50

interface BankVerification {
  organizerId: string
  organizerName: string
  organizerEmail: string
  destinationId: string
  isPrimary?: boolean
  bankDetails: {
    accountName: string
    accountNumber: string
    bankName: string
    routingNumber?: string
  }
  verificationDoc: {
    type: string
    verificationType: string
    status: string
    submittedAt: string
    documentPath?: string
    documentName: string
    documentSize: number
  }
}

function toISOStringMaybe(value: any): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value?.toDate === 'function') {
    try {
      const date = value.toDate()
      if (date instanceof Date) return date.toISOString()
    } catch {
      // no-op
    }
  }
  return String(value)
}

function encodeCursor(cursor: { submittedAt: string; path: string }): string {
  const payload = JSON.stringify(cursor)
  return Buffer.from(payload, 'utf8').toString('base64url')
}

function decodeCursor(raw: string | undefined): { submittedAt: string; path: string } | null {
  if (!raw) return null
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8')
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof (parsed as any).submittedAt !== 'string') return null
    if (typeof (parsed as any).path !== 'string') return null
    return { submittedAt: (parsed as any).submittedAt, path: (parsed as any).path }
  } catch {
    return null
  }
}

function isBankVerificationDoc(doc: any, data: any): boolean {
  const id = String(doc?.id || '')
  if (id === 'bank' || id === 'bank_primary') return true
  if (id.startsWith('bank_')) return true
  // Newer schema includes explicit type.
  if (String(data?.type || '').toLowerCase() === 'bank') return true
  return false
}

function normalizeStatus(raw: unknown): 'pending' | 'verified' | 'failed' {
  const value = String(raw || 'pending').toLowerCase().trim()
  if (value === 'verified' || value === 'approved') return 'verified'
  if (value === 'failed' || value === 'rejected' || value === 'declined') return 'failed'
  return 'pending'
}

export default async function AdminBankVerificationsPage({
  searchParams,
}: {
  searchParams?: { status?: string; cursor?: string }
}) {
  const statusParamRaw = String(searchParams?.status || 'all').toLowerCase()
  const statusParam = (['pending', 'verified', 'failed', 'all'] as const).includes(statusParamRaw as any)
    ? (statusParamRaw as 'pending' | 'verified' | 'failed' | 'all')
    : 'pending'

  const cursor = decodeCursor(searchParams?.cursor)

  // Fetch bank verifications (bounded) in a way that avoids requiring composite indexes.
  const bankVerifications: BankVerification[] = []
  let bankVerificationFetchError: string | null = null

  let bankVerificationDocs: any[] = []
  try {
    // Legacy-safe query: many older docs don't include `type: 'bank'`.
    // Query by doc id prefix instead (bank / bank_*).
    // Avoid orderBy to reduce chances of type-mismatch errors across historical docs.
    const queryRef: any = adminDb
      .collectionGroup('verificationDocuments')
      .where(FieldPath.documentId(), '>=', 'bank')
      .where(FieldPath.documentId(), '<=', 'bank\uf8ff')

    // Cursor is intentionally disabled in this mode.
    const snap = await queryRef.limit(Math.max(PAGE_SIZE * 10, 200)).get()
    bankVerificationDocs = snap.docs
  } catch (err) {
    console.error('Failed to fetch bank verification docs:', err)
    const primaryErrorMessage = err instanceof Error ? err.message : 'Unknown error'

    // Fallback to the older per-organizer scan approach.
    // This avoids collectionGroup indexing requirements which can cause FAILED_PRECONDITION in some prod setups.
    try {
      let organizerIds: string[] = []

      try {
        const organizersSnap = await adminDb
          .collection('users')
          .where('role', '==', 'organizer')
          .limit(500)
          .get()
        organizerIds = organizersSnap.docs.map((d: any) => d.id)
      } catch {
        organizerIds = []
      }

      if (organizerIds.length === 0) {
        const organizersSnap = await adminDb.collection('organizers').limit(500).get()
        organizerIds = organizersSnap.docs.map((d: any) => d.id)
      }

      const docs: any[] = []
      for (const organizerId of organizerIds) {
        try {
          const snap = await adminDb
            .collection('organizers')
            .doc(organizerId)
            .collection('verificationDocuments')
            .get()
          for (const d of snap.docs) {
            const data = (d.data?.() || {}) as any
            if (isBankVerificationDoc(d, data)) docs.push(d)
          }
          if (docs.length >= 2000) break
        } catch {
          // Ignore individual organizer failures.
        }
      }

      bankVerificationDocs = docs
      bankVerificationFetchError = null
    } catch (fallbackErr) {
      console.error('Failed legacy fallback for bank verification docs:', fallbackErr)
      bankVerificationFetchError = primaryErrorMessage
      bankVerificationDocs = []
    }
  }

  // Pagination is disabled when filtering/sorting in-memory.
  const hasNextPage = false
  const nextCursor = null

  // Filter + sort in-memory.
  const filteredDocs = bankVerificationDocs
    .filter((doc: any) => {
      const data = (doc.data?.() || {}) as any
      if (!isBankVerificationDoc(doc, data)) return false
      if (statusParam === 'all') return true
      return normalizeStatus(data?.status) === statusParam
    })
    .sort((a: any, b: any) => {
      const aData = (a.data?.() || {}) as any
      const bData = (b.data?.() || {}) as any
      const aSubmittedAt = toISOStringMaybe(aData?.submittedAt || aData?.submitted_at || aData?.createdAt || aData?.created_at)
      const bSubmittedAt = toISOStringMaybe(bData?.submittedAt || bData?.submitted_at || bData?.createdAt || bData?.created_at)
      return new Date(bSubmittedAt || 0).getTime() - new Date(aSubmittedAt || 0).getTime()
    })

  const pageDocs = filteredDocs.slice(0, PAGE_SIZE)

  const rows = pageDocs
    .map((doc: any) => {
      const data = (doc.data?.() || {}) as any
      const organizerId = doc?.ref?.parent?.parent?.id ? String(doc.ref.parent.parent.id) : ''
      const docId = String(doc.id || '')

      const destinationId = (() => {
        if (data?.destinationId) {
          const raw = String(data.destinationId)
          // New schema stores the payout destination doc id directly (e.g. 'bank_primary' or a random id).
          // Older/buggy payloads may store the verification doc id (e.g. 'bank_<destinationId>').
          // Never strip 'bank_primary' (it is the destination id).
          return raw.startsWith('bank_') && raw !== 'bank_primary' ? raw.slice('bank_'.length) : raw
        }
        if (docId.startsWith('bank_')) return docId.slice('bank_'.length)
        if (docId === 'bank' || docId === 'bank_primary') return 'bank_primary'
        return ''
      })()

      if (!organizerId || !destinationId) return null

      const normalizedStatus = normalizeStatus(data?.status)

      return {
        organizerId,
        destinationId,
        status: normalizedStatus,
        submittedAt: toISOStringMaybe(data?.submittedAt || data?.submitted_at || data?.createdAt || data?.created_at),
        verificationData: data,
        docId,
      }
    })
    .filter(Boolean) as Array<{
    organizerId: string
    destinationId: string
    status: string
    submittedAt: string
    verificationData: any
    docId: string
  }>

  const organizerIds = Array.from(new Set(rows.map((r) => r.organizerId)))

  // Batch-load organizer user docs (Firestore `in` supports max 10 ids per query).
  const organizersById = new Map<string, any>()
  try {
    const batches: Promise<any>[] = []
    for (let i = 0; i < organizerIds.length; i += 10) {
      const batch = organizerIds.slice(i, i + 10)
      batches.push(adminDb.collection('users').where('__name__', 'in', batch).get())
    }
    const snaps = await Promise.all(batches)
    for (const snap of snaps) {
      for (const doc of snap.docs) {
        organizersById.set(doc.id, doc.data())
      }
    }
  } catch (err) {
    console.error('Failed to fetch organizers for bank verifications:', err)
  }

  // Prefetch payout destinations + legacy payout config per organizer.
  const destinationRefs: any[] = []
  const payoutConfigRefs: any[] = []
  const destinationKeyForRef = new Map<string, string>()

  for (const r of rows) {
    const destRef = adminDb
      .collection('organizers')
      .doc(r.organizerId)
      .collection('payoutDestinations')
      .doc(r.destinationId)
    destinationRefs.push(destRef)
    destinationKeyForRef.set(destRef.path, `${r.organizerId}:${r.destinationId}`)
  }

  for (const organizerId of organizerIds) {
    payoutConfigRefs.push(
      adminDb.collection('organizers').doc(organizerId).collection('payoutConfig').doc('main')
    )
  }

  const destinationByKey = new Map<string, any>()
  const payoutConfigByOrganizerId = new Map<string, any>()

  try {
    const getAll = (adminDb as any).getAll?.bind(adminDb)
    if (typeof getAll === 'function') {
      const destSnaps = destinationRefs.length ? await getAll(...destinationRefs) : []
      for (const snap of destSnaps) {
        const key = destinationKeyForRef.get(snap.ref.path)
        if (!key) continue
        destinationByKey.set(key, snap.exists ? snap.data() : null)
      }

      const payoutSnaps = payoutConfigRefs.length ? await getAll(...payoutConfigRefs) : []
      for (const snap of payoutSnaps) {
        const organizerId = snap?.ref?.parent?.parent?.id ? String(snap.ref.parent.parent.id) : ''
        if (!organizerId) continue
        payoutConfigByOrganizerId.set(organizerId, snap.exists ? snap.data() : null)
      }
    } else {
      // Fallback if getAll isn't available (should be available in Firestore Admin).
      const [destSnaps, payoutSnaps] = await Promise.all([
        Promise.all(destinationRefs.map((ref) => ref.get())),
        Promise.all(payoutConfigRefs.map((ref) => ref.get())),
      ])

      for (const snap of destSnaps) {
        const key = destinationKeyForRef.get(snap.ref.path)
        if (!key) continue
        destinationByKey.set(key, snap.exists ? snap.data() : null)
      }

      for (const snap of payoutSnaps) {
        const organizerId = snap?.ref?.parent?.parent?.id ? String(snap.ref.parent.parent.id) : ''
        if (!organizerId) continue
        payoutConfigByOrganizerId.set(organizerId, snap.exists ? snap.data() : null)
      }
    }
  } catch (err) {
    console.error('Failed to prefetch payout destinations/config:', err)
  }

  for (const r of rows) {
    const organizerData = organizersById.get(r.organizerId) || {}
    const destinationData = destinationByKey.get(`${r.organizerId}:${r.destinationId}`)
    const legacyBankDetails = payoutConfigByOrganizerId.get(r.organizerId)?.bankDetails

    // Best-effort decrypt (only for pending; avoids extra work for historical rows).
    let decryptedAccountNumber: string | null = null
    let decryptedRoutingNumber: string | null = null
    if (r.status === 'pending' && destinationData) {
      try {
        const decrypted = await getDecryptedBankDestination({
          organizerId: r.organizerId,
          destinationId: r.destinationId,
        })
        decryptedAccountNumber = decrypted?.accountNumber ? String(decrypted.accountNumber) : null
        decryptedRoutingNumber = decrypted?.routingNumber ? String(decrypted.routingNumber) : null
      } catch {
        decryptedAccountNumber = null
        decryptedRoutingNumber = null
      }
    }

    const bankDetails = destinationData
      ? {
          accountName: String(destinationData.accountName || ''),
          accountNumber:
            decryptedAccountNumber ||
            (destinationData.accountNumberLast4
              ? `****${String(destinationData.accountNumberLast4)}`
              : '****'),
          bankName: String(destinationData.bankName || ''),
          routingNumber: decryptedRoutingNumber || undefined,
        }
      : legacyBankDetails

    if (!bankDetails) continue

    bankVerifications.push({
      organizerId: r.organizerId,
      organizerName: organizerData.full_name || organizerData.email || 'Unknown',
      organizerEmail: organizerData.email || '',
      destinationId: r.destinationId,
      isPrimary: Boolean(destinationData?.isPrimary) || r.destinationId === 'bank_primary',
      bankDetails,
      verificationDoc: {
        type: String(r.verificationData?.type || 'bank'),
        verificationType: String(r.verificationData?.verificationType || ''),
        status: r.status,
        submittedAt: r.submittedAt,
        documentPath: r.verificationData?.documentPath ? String(r.verificationData.documentPath) : undefined,
        documentName: String(r.verificationData?.documentName || ''),
        documentSize: Number(r.verificationData?.documentSize || 0),
      },
    })
  }

  // Sort by submission date (newest first)
  bankVerifications.sort(
    (a, b) => new Date(b.verificationDoc.submittedAt).getTime() - new Date(a.verificationDoc.submittedAt).getTime()
  )

  // Filter by status
  const pending = bankVerifications.filter(v => v.verificationDoc.status === 'pending')
  const verified = bankVerifications.filter(v => v.verificationDoc.status === 'verified')
  const failed = bankVerifications.filter(v => v.verificationDoc.status === 'failed')

  // Stats: computed from loaded data (legacy-safe). If you have many thousands of docs,
  // these counts reflect the current loaded window rather than the entire dataset.
  const pendingCount = pending.length
  const verifiedCount = verified.length
  const failedCount = failed.length

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 border-b border-purple-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-4">
            <Link href="/admin" className="inline-flex items-center gap-2 px-4 py-2 text-purple-100 hover:text-white hover:bg-purple-700 rounded-lg transition-colors text-sm font-medium">
              <span>←</span>
              <span>Back to Admin</span>
            </Link>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Bank Verifications</h1>
              <p className="text-purple-100 text-sm sm:text-base max-w-2xl">
                Review and approve organizer bank account verifications
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-purple-500/30 backdrop-blur-sm rounded-xl p-4">
              <div className="text-purple-100 text-sm font-medium">Pending</div>
              <div className="text-white text-3xl font-bold mt-1">{pendingCount ?? '—'}</div>
            </div>
            <div className="bg-green-500/30 backdrop-blur-sm rounded-xl p-4">
              <div className="text-green-100 text-sm font-medium">Verified</div>
              <div className="text-white text-3xl font-bold mt-1">{verifiedCount ?? '—'}</div>
            </div>
            <div className="bg-red-500/30 backdrop-blur-sm rounded-xl p-4">
              <div className="text-red-100 text-sm font-medium">Failed</div>
              <div className="text-white text-3xl font-bold mt-1">{failedCount ?? '—'}</div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-2 mt-6">
            <Link
              href={{ pathname: '/admin/bank-verifications', query: { status: 'pending' } }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${statusParam === 'pending' ? 'bg-white text-purple-700' : 'bg-purple-500/20 text-purple-100 hover:bg-purple-500/30'}`}
            >
              Pending
            </Link>
            <Link
              href={{ pathname: '/admin/bank-verifications', query: { status: 'verified' } }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${statusParam === 'verified' ? 'bg-white text-purple-700' : 'bg-purple-500/20 text-purple-100 hover:bg-purple-500/30'}`}
            >
              Verified
            </Link>
            <Link
              href={{ pathname: '/admin/bank-verifications', query: { status: 'failed' } }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${statusParam === 'failed' ? 'bg-white text-purple-700' : 'bg-purple-500/20 text-purple-100 hover:bg-purple-500/30'}`}
            >
              Failed
            </Link>
            <Link
              href={{ pathname: '/admin/bank-verifications', query: { status: 'all' } }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${statusParam === 'all' ? 'bg-white text-purple-700' : 'bg-purple-500/20 text-purple-100 hover:bg-purple-500/30'}`}
            >
              All
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {bankVerificationFetchError ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="text-sm font-semibold text-red-900">Failed to load bank verifications</div>
            <div className="mt-1 text-sm text-red-800 break-words">{bankVerificationFetchError}</div>
            <div className="mt-2 text-xs text-red-700">
              This usually means a Firestore index/config mismatch. The page will show empty until it can query verification documents.
            </div>
          </div>
        ) : null}

        {/* Pending Verifications */}
        {(statusParam === 'pending' || statusParam === 'all') && pending.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Pending Review ({pending.length})
            </h2>
            <div className="space-y-4">
              {pending.map((verification) => (
                <BankVerificationReviewCard
                  key={`${verification.organizerId}:${verification.destinationId}`}
                  verification={verification}
                />
              ))}
            </div>
          </div>
        )}

        {/* Verified */}
        {(statusParam === 'verified' || statusParam === 'all') && verified.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Verified ({verified.length})
            </h2>
            <div className="space-y-4">
              {verified.map((verification) => (
                <BankVerificationReviewCard
                  key={`${verification.organizerId}:${verification.destinationId}`}
                  verification={verification}
                />
              ))}
            </div>
          </div>
        )}

        {/* Failed */}
        {(statusParam === 'failed' || statusParam === 'all') && failed.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Failed ({failed.length})
            </h2>
            <div className="space-y-4">
              {failed.map((verification) => (
                <BankVerificationReviewCard
                  key={`${verification.organizerId}:${verification.destinationId}`}
                  verification={verification}
                />
              ))}
            </div>
          </div>
        )}

        {bankVerifications.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No verifications yet</h3>
            <p className="text-gray-600">Bank verification requests will appear here when organizers submit them.</p>
          </div>
        )}

        {hasNextPage && nextCursor && (
          <div className="flex justify-end mt-8">
            <Link
              href={{ pathname: '/admin/bank-verifications', query: { status: statusParam, cursor: nextCursor } }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Next page →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
