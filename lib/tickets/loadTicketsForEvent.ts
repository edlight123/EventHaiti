import { adminDb } from '@/lib/firebase/admin'

type TicketQueryOptions = {
  status?: string
}

/**
 * Loads Firestore ticket docs for an event.
 *
 * Some older tickets were written with a legacy field name `eventId` instead of
 * the canonical `event_id`. Organizer pages should include both.
 */
export async function loadTicketDocsForEvent(
  eventId: string,
  options: TicketQueryOptions = {}
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const base = adminDb.collection('tickets')

  const withStatus = (q: FirebaseFirestore.Query) => {
    if (options.status) return q.where('status', '==', options.status)
    return q
  }

  const [byEventId, byLegacyEventId] = await Promise.all([
    withStatus(base.where('event_id', '==', eventId)).get().catch(() => null),
    withStatus(base.where('eventId', '==', eventId)).get().catch(() => null),
  ])

  const deduped = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>()
  for (const snap of [byEventId, byLegacyEventId]) {
    if (!snap) continue
    for (const doc of snap.docs) deduped.set(doc.id, doc)
  }

  return Array.from(deduped.values())
}
