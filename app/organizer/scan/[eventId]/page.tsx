import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { DoorModeInterface } from '@/components/scan/DoorModeInterface'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DoorModeScanPage({ params }: { params: Promise<{ eventId: string }> }) {
  // Verify authentication
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (!sessionCookie) {
    redirect('/auth/login')
  }

  let authUser
  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    authUser = decodedClaims
  } catch (error) {
    console.error('Error verifying session:', error)
    redirect('/auth/login')
  }

  const { eventId } = await params

  // Fetch event
  const eventDoc = await adminDb.collection('events').doc(eventId).get()
  
  if (!eventDoc.exists) {
    notFound()
  }

  const eventData = eventDoc.data()
  const event = {
    id: eventDoc.id,
    title: eventData.title,
    organizer_id: eventData.organizer_id,
    start_datetime: eventData.start_datetime?.toDate?.()?.toISOString() || eventData.start_datetime,
    end_datetime: eventData.end_datetime?.toDate?.()?.toISOString() || eventData.end_datetime,
    venue_name: eventData.venue_name,
    city: eventData.city,
    entry_points: eventData.entry_points
  }

  // Verify organizer
  if (event.organizer_id !== authUser.uid) {
    redirect('/organizer/scan')
  }

  // Fetch all confirmed tickets for this event
  const ticketsSnapshot = await adminDb
    .collection('tickets')
    .where('event_id', '==', eventId)
    .where('status', '==', 'confirmed')
    .get()

  const tickets = await Promise.all(
    ticketsSnapshot.docs.map(async (doc: any) => {
      const ticketData = doc.data()
      
      // Fetch attendee user data
      let attendee = null
      if (ticketData.attendee_id) {
        try {
          const userDoc = await adminDb.collection('users').doc(ticketData.attendee_id).get()
          if (userDoc.exists) {
            const userData = userDoc.data()
            // Only include primitive fields from user data
            attendee = {
              id: userDoc.id,
              email: userData.email || '',
              full_name: userData.full_name || '',
              phone_number: userData.phone_number || ''
            }
          }
        } catch (error) {
          console.error('Error fetching attendee:', error)
        }
      }

      // Explicitly map only the fields we need
      return {
        id: doc.id,
        event_id: ticketData.event_id || '',
        attendee_id: ticketData.attendee_id || '',
        status: ticketData.status || 'confirmed',
        ticket_type: ticketData.ticket_type || 'General Admission',
        price_paid: ticketData.price_paid || 0,
        checked_in: ticketData.checked_in || false,
        qr_code: ticketData.qr_code || ticketData.qr_code_data || '',
        attendee,
        purchased_at: ticketData.purchased_at?.toDate?.()?.toISOString() || ticketData.purchased_at || new Date().toISOString(),
        checked_in_at: ticketData.checked_in_at?.toDate?.()?.toISOString() || ticketData.checked_in_at || null,
        created_at: ticketData.created_at?.toDate?.()?.toISOString() || ticketData.created_at || new Date().toISOString(),
        updated_at: ticketData.updated_at?.toDate?.()?.toISOString() || ticketData.updated_at || new Date().toISOString(),
      }
    })
  )

  // Get entry points from event or use defaults
  const entryPoints = event.entry_points || ['Main Entrance', 'VIP Entrance', 'Gate A', 'Gate B']

  return (
    <DoorModeInterface
      eventId={eventId}
      eventTitle={event.title}
      scannedBy={authUser.uid}
      tickets={tickets}
      defaultEntryPoints={entryPoints}
    />
  )
}
