import { adminDb } from '@/lib/firebase/admin'
import Link from 'next/link'

export const revalidate = 30

function serializeFirestoreValue(value: any): any {
  if (value == null) return value

  if (typeof value?.toDate === 'function') {
    try {
      const d = value.toDate()
      if (d instanceof Date) return d.toISOString()
    } catch {
      // ignore
    }
  }

  if (value instanceof Date) return value.toISOString()

  if (Array.isArray(value)) return value.map(serializeFirestoreValue)

  if (typeof value === 'object') {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) out[k] = serializeFirestoreValue(v)
    return out
  }

  return value
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: { selected?: string }
}) {
  const selected = searchParams?.selected ? String(searchParams.selected) : ''

  // Load a small, recent window of ticket docs (admin search currently labels these as "orders").
  let recentTickets: Array<{ id: string; data: any }> = []
  try {
    let snap
    try {
      snap = await adminDb.collection('tickets').orderBy('purchased_at', 'desc').limit(25).get()
    } catch {
      try {
        snap = await adminDb.collection('tickets').orderBy('purchasedAt', 'desc').limit(25).get()
      } catch {
        snap = await adminDb.collection('tickets').limit(25).get()
      }
    }

    recentTickets = snap.docs.map((doc: any) => ({
      id: doc.id,
      data: serializeFirestoreValue(doc.data()),
    }))
  } catch (e) {
    console.warn('[admin/orders] Failed to load recent tickets', e)
    recentTickets = []
  }

  let selectedTicket: { id: string; data: any } | null = null
  if (selected) {
    try {
      const doc = await adminDb.collection('tickets').doc(selected).get()
      if (doc.exists) {
        selectedTicket = { id: doc.id, data: serializeFirestoreValue(doc.data()) }
      }
    } catch (e) {
      console.warn('[admin/orders] Failed to load selected ticket', e)
      selectedTicket = null
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      <div className="mb-4 sm:mb-6">
        <Link href="/admin" className="text-teal-600 hover:text-teal-700 text-[13px] sm:text-sm font-medium">
          ← Back to Admin Dashboard
        </Link>
      </div>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders</h1>
        <p className="text-[13px] sm:text-base text-gray-600 mt-1 sm:mt-2">
          Read-only view of recent ticket documents (used by Admin Search).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <p className="text-xs text-gray-500">Showing up to 25 recent tickets</p>
          </div>

          {recentTickets.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">No recent tickets found.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentTickets.map((t) => {
                  const attendee = t.data?.attendee_email || t.data?.attendeeEmail || t.data?.email || ''
                  const status = t.data?.status || ''
                  const eventId = t.data?.event_id || t.data?.eventId || ''
                  return (
                    <Link
                      key={t.id}
                      href={`/admin/orders?selected=${encodeURIComponent(t.id)}`}
                      className={`block px-4 py-3 hover:bg-gray-50 ${selected === t.id ? 'bg-teal-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">Order {t.id.slice(0, 8)}…</div>
                          <div className="text-xs text-gray-500 truncate">{attendee || 'Unknown attendee'}</div>
                          {eventId ? (
                            <div className="text-xs text-gray-400 truncate">Event: {eventId}</div>
                          ) : null}
                        </div>
                        {status ? (
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 whitespace-nowrap">
                            {status}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Details</h2>
              <p className="text-xs text-gray-500">
                {selectedTicket ? 'Ticket document payload (serialized)' : 'Select an order to view details'}
              </p>
            </div>

            <div className="p-4">
              {selectedTicket ? (
                <pre className="text-xs whitespace-pre-wrap break-words max-h-[70vh] overflow-auto bg-gray-50 border border-gray-200 rounded-lg p-3">
                  {JSON.stringify({ id: selectedTicket.id, ...selectedTicket.data }, null, 2)}
                </pre>
              ) : (
                <div className="text-sm text-gray-500">
                  Tip: use the Admin command bar search and click an “order” result.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  )
}
