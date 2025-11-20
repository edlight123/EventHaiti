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

  // Fetch organizer's events
  const { data: events } = await supabase
    .from('events')
    .select('id, title')
    .eq('organizer_id', user.id)
    .order('start_datetime', { ascending: false })

  // Fetch promo codes
  let promoCodesData: any[] = []
  
  try {
    const { data: promoCodes, error } = await supabase
      .from('promo_codes')
      .select(`
        *,
        event:events (
          title
        )
      `)
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false })
    
    if (!error && promoCodes) {
      promoCodesData = promoCodes
    }
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
