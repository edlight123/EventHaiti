import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { CheckInInterface } from '@/components/check-in/CheckInInterface'
import { checkInTicket } from './actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CheckInPage({ params }: PageProps) {
  const { id: eventId } = await params
  
  // Verify authentication
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (!sessionCookie) {
    redirect('/login')
  }

  let authUser
  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    authUser = decodedClaims
  } catch (error) {
    console.error('Error verifying session:', error)
    redirect('/login')
  }

  // Fetch event details
  const eventDoc = await adminDb.collection('events').doc(eventId).get()

  if (!eventDoc.exists) {
    redirect('/organizer/events')
  }

  const eventData = eventDoc.data()

  // Verify organizer access
  if (eventData?.organizer_id !== authUser.uid) {
    redirect('/organizer/events')
  }

  // Fetch all tickets for this event
  const ticketsSnapshot = await adminDb
    .collection('tickets')
    .where('event_id', '==', eventId)
    .get()

  const tickets = ticketsSnapshot.docs.map((doc: any) => {
    const data = doc.data()
    return {
      id: doc.id,
      event_id: data.event_id,
      user_id: data.user_id,
      order_id: data.order_id,
      ticket_type: data.ticket_type,
      price: data.price,
      status: data.status,
      checked_in: data.checked_in || false,
      checked_in_at: data.checked_in_at?.toDate().toISOString() || null,
      entry_point: data.entry_point || null,
      attendee_name: data.attendee_name || '',
      attendee_email: data.attendee_email || '',
      qr_code: data.qr_code || doc.id,
      purchased_at: data.purchased_at?.toDate().toISOString() || null,
    }
  })

  const event = {
    id: eventDoc.id,
    title: eventData?.title || '',
    start_datetime: eventData?.start_datetime?.toDate().toISOString() || '',
    organizer_id: eventData?.organizer_id || '',
  }

  return <CheckInInterface event={event} tickets={tickets} onCheckIn={checkInTicket} />
}
