import 'server-only'

import { adminDb } from '@/lib/firebase/admin'
import { normalizeCountryCode } from '@/lib/payment-provider'

export function inferCountryFromEventText(event: any): string {
  const normalized = normalizeCountryCode(event?.country)
  if (normalized) return normalized

  const haystack = [
    event?.country,
    event?.city,
    event?.commune,
    event?.address,
    event?.venue_address,
    event?.venue_name,
    event?.location,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  // Minimal Haiti heuristics for legacy rows missing explicit country.
  if (haystack.includes('haiti')) return 'HT'
  if (haystack.includes('port-au-prince') || haystack.includes('port au prince')) return 'HT'
  if (haystack.includes('cap-haitien') || haystack.includes('cap haitien')) return 'HT'
  if (haystack.includes('petion-ville') || haystack.includes('petion ville') || haystack.includes('pétion-ville')) return 'HT'
  if (haystack.includes('delmas')) return 'HT'
  if (haystack.includes('turgeau')) return 'HT'
  if (haystack.includes('martissant')) return 'HT'
  if (haystack.includes('jacmel')) return 'HT'
  if (haystack.includes('gonaives') || haystack.includes('gonaïves')) return 'HT'
  if (haystack.includes('jeremie') || haystack.includes('jérémie')) return 'HT'
  if (haystack.includes('les cayes') || haystack.includes('cayes')) return 'HT'

  return ''
}

export async function inferCountryFromOrganizer(organizerId: unknown): Promise<string> {
  const id = String(organizerId || '').trim()
  if (!id) return ''

  try {
    const userDoc = await adminDb.collection('users').doc(id).get()
    if (userDoc.exists) {
      const data: any = userDoc.data() || {}
      const fromUser = normalizeCountryCode(data.default_country || data.country)
      if (fromUser) return fromUser
    }
  } catch {
    // Ignore and fall through.
  }

  return ''
}

export async function resolveEventCountry(event: any): Promise<string> {
  const explicit = normalizeCountryCode(event?.country)
  if (explicit) return explicit

  const fromText = inferCountryFromEventText(event)
  if (fromText) return fromText

  const fromOrganizer = await inferCountryFromOrganizer(event?.organizer_id)
  if (fromOrganizer) return fromOrganizer

  return ''
}
