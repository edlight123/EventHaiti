import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { adminDb } from '@/lib/firebase/admin'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import OrganizerDetailsClient from './OrganizerDetailsClient'

async function getOrganizerDetails(organizerId: string) {
  try {
    // Get user data
    const userDoc = await adminDb.collection('users').doc(organizerId).get()
    if (!userDoc.exists) {
      return null
    }

    const userData = userDoc.data()

    // Get organizer profile data
    const organizerDoc = await adminDb.collection('organizers').doc(organizerId).get()
    const organizerData = organizerDoc.exists ? organizerDoc.data() : null

    // Get payout config
    const payoutConfigDoc = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payoutConfig')
      .doc('main')
      .get()
    const payoutConfig = payoutConfigDoc.exists ? payoutConfigDoc.data() : null

    // Get verification request
    const verificationRequestDoc = await adminDb
      .collection('verification_requests')
      .doc(organizerId)
      .get()
    const verificationRequest = verificationRequestDoc.exists ? verificationRequestDoc.data() : null

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
        ...doc.data()
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
      user: {
        ...userData,
        created_at: userData?.created_at?.toDate?.()?.toISOString() || userData?.created_at,
        updated_at: userData?.updated_at?.toDate?.()?.toISOString() || userData?.updated_at,
      },
      organizer: organizerData ? {
        ...organizerData,
        created_at: organizerData?.created_at?.toDate?.()?.toISOString() || organizerData?.created_at,
        updated_at: organizerData?.updated_at?.toDate?.()?.toISOString() || organizerData?.updated_at,
      } : null,
      payoutConfig,
      verificationRequest: verificationRequest ? {
        ...verificationRequest,
        submitted_at: verificationRequest?.submitted_at?.toDate?.()?.toISOString() || verificationRequest?.submitted_at,
        reviewed_at: verificationRequest?.reviewed_at?.toDate?.()?.toISOString() || verificationRequest?.reviewed_at,
      } : null,
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
  const user = await getCurrentUser()
  
  if (!user || !isAdmin(user.email)) {
    redirect('/')
  }

  const organizerDetails = await getOrganizerDetails(params.id)

  if (!organizerDetails) {
    redirect('/admin/users')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={true} />
      
      <OrganizerDetailsClient organizerDetails={organizerDetails} />
      
      <MobileNavWrapper user={user} />
    </div>
  )
}
