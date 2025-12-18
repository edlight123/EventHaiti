import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { adminDb } from '@/lib/firebaseAdmin'
import { getEventEarnings } from '@/lib/earnings'
import { calculateFees } from '@/lib/fees'
import EventEarningsView from './EventEarningsView'
import Navbar from '@/components/Navbar'
import { isAdmin } from '@/lib/admin'
import MobileNavWrapper from '@/components/MobileNavWrapper'

export const revalidate = 30

export const metadata = {
  title: 'Event Earnings - EventHaiti',
  description: 'View earnings and request withdrawal for your event'
}

export default async function EventEarningsPage({
  params
}: {
  params: { id: string }
}) {
  const { user, error } = await requireAuth()
  if (error || !user) redirect('/auth/login')

  const eventId = params.id

  // Fetch event details
  const eventDoc = await adminDb.collection('events').doc(eventId).get()
  if (!eventDoc.exists) {
    return <div>Event not found</div>
  }

  const eventData = eventDoc.data()

  // Check ownership
  if (eventData?.organizer_id !== user.id) {
    redirect('/organizer')
  }

  // Fetch earnings
  const earnings = await getEventEarnings(eventId)

  // Serialize Firestore timestamps
  const serializeData = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj
    if (obj.toDate && typeof obj.toDate === 'function') return obj.toDate().toISOString()
    if (Array.isArray(obj)) return obj.map(serializeData)
    
    const serialized: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeData(obj[key])
      }
    }
    return serialized
  }

  const serializedEvent = serializeData({
    id: eventDoc.id,
    ...eventData
  })

  const serializedEarnings = serializeData(earnings)

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />
      
      <EventEarningsView
        event={serializedEvent}
        earnings={serializedEarnings}
        organizerId={user.id}
      />
      
      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
