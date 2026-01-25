import { requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { adminDb } from '@/lib/firebase/admin'
import OrganizerDetailsClient from './OrganizerDetailsClient'

export const dynamic = 'force-dynamic'

function serializeFirestoreValue(value: any): any {
  if (value === null || value === undefined) return value

  // Firestore Timestamp (firebase-admin)
  if (typeof value?.toDate === 'function') {
    try {
      const d: any = value.toDate()
      if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString()
    } catch {
      // fall through
    }
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.map((v) => serializeFirestoreValue(v))
  }

  if (typeof value === 'object') {
    // Firestore DocumentReference-ish
    if (typeof (value as any)?.path === 'string') {
      return (value as any).path
    }

    // Firestore GeoPoint-ish
    if (typeof (value as any)?.latitude === 'number' && typeof (value as any)?.longitude === 'number') {
      return { latitude: (value as any).latitude, longitude: (value as any).longitude }
    }

    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = serializeFirestoreValue(v)
    }
    return out
  }

  return value
}

async function getOrganizerDetails(organizerId: string) {
  try {
    // Get user data
    const userDoc = await adminDb.collection('users').doc(organizerId).get()
    if (!userDoc.exists) {
      return null
    }

    const userData = serializeFirestoreValue(userDoc.data())

    // Get organizer profile data
    const organizerDoc = await adminDb.collection('organizers').doc(organizerId).get()
    const organizerData = organizerDoc.exists ? serializeFirestoreValue(organizerDoc.data()) : null

    // Get payout config
    const payoutConfigDoc = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payoutConfig')
      .doc('main')
      .get()
    const payoutConfig = payoutConfigDoc.exists ? serializeFirestoreValue(payoutConfigDoc.data()) : null

    // Get verification request
    const verificationRequestDoc = await adminDb
      .collection('verification_requests')
      .doc(organizerId)
      .get()
    const verificationRequest = verificationRequestDoc.exists ? serializeFirestoreValue(verificationRequestDoc.data()) : null

    // Get verification documents
    const verificationDocsSnapshot = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('verificationDocuments')
      .get()
    
    const verificationDocs: any[] = []
    verificationDocsSnapshot.docs.forEach((doc: any) => {
      verificationDocs.push({
        id: doc.id,
        ...serializeFirestoreValue(doc.data())
      })
    })

    // Get organizer's events count
    const eventsSnapshot = await adminDb
      .collection('events')
      .where('organizer_id', '==', organizerId)
      .count()
      .get()
    const eventsCount = eventsSnapshot.data().count

    // Get published events count
    const publishedEventsSnapshot = await adminDb
      .collection('events')
      .where('organizer_id', '==', organizerId)
      .where('status', '==', 'published')
      .count()
      .get()
    const publishedEventsCount = publishedEventsSnapshot.data().count

    // Get ticket sales count
    const ticketsSnapshot = await adminDb
      .collection('tickets')
      .where('organizer_id', '==', organizerId)
      .count()
      .get()
    const ticketsCount = ticketsSnapshot.data().count

    return {
      id: organizerId,
      user: userData,
      organizer: organizerData,
      payoutConfig,
      verificationRequest,
      verificationDocs,
      stats: {
        totalEvents: eventsCount,
        publishedEvents: publishedEventsCount,
        ticketsSold: ticketsCount,
      }
    }
  } catch (error) {
    console.error('Error fetching organizer details:', error)
    return null
  }
}

export default async function OrganizerDetailPage({ params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin()
  
  if (error || !user) {
    redirect('/')
  }

  const organizerDetails = await getOrganizerDetails(params.id)

  if (!organizerDetails) {
    redirect('/admin/organizers')
  }

  return (
    <OrganizerDetailsClient organizerDetails={organizerDetails} />
  )
}
