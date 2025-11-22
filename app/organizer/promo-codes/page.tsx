import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import PromoCodeManager from './PromoCodeManager'

export const revalidate = 0

export default async function PromoCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  const supabase = await createClient()
  const params = await searchParams

  // Fetch all events and filter for this organizer
  const allEventsQuery = await supabase
    .from('events')
    .select('id, title, start_datetime, organizer_id')
  
  const allEvents = allEventsQuery.data || []
  const events = allEvents
    .filter((e: any) => e.organizer_id === user.id)
    .sort((a: any, b: any) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime())

  // Fetch promo codes (no joins with Firebase)
  let promoCodesData: any[] = []
  
  try {
    const allPromoCodesQuery = await supabase
      .from('promo_codes')
      .select('*')
    
    const allPromoCodes = allPromoCodesQuery.data || []
    const userPromoCodes = allPromoCodes.filter((pc: any) => pc.organizer_id === user.id)
    
    // Get event titles separately
    const eventsMap = new Map()
    if (events) {
      events.forEach((event: any) => {
        eventsMap.set(event.id, event.title)
      })
    }
    
    // Attach event data manually
    promoCodesData = userPromoCodes.map((pc: any) => ({
      ...pc,
      event: pc.event_id ? { title: eventsMap.get(pc.event_id) } : null
    }))
    
    // Sort by created_at descending
    promoCodesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } catch (error) {
    // Table doesn't exist yet
    console.log('Promo codes table not found')
  }

  const eventsData = events || []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Promo Codes</h1>
            <p className="text-gray-600 mt-2">Create discount codes for your events</p>
          </div>
          <Link
            href="/organizer/events"
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            ← Back to Events
          </Link>
        </div>

        <PromoCodeManager 
          events={eventsData} 
          promoCodes={promoCodesData}
          organizerId={user.id}
        />
      </div>
    </div>
  )
}
