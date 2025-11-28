import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PullToRefresh from '@/components/PullToRefresh'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import PaymentSettingsForm from './PaymentSettingsForm'

export const revalidate = 0

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  const supabase = await createClient()

  // Fetch user's payment settings
  let settings = null
  
  try {
    const allSettingsQuery = await supabase
      .from('organizer_settings')
      .select('*')
    
    const allSettings = allSettingsQuery.data || []
    settings = allSettings.find((s: any) => s.organizer_id === user.id) || null
  } catch (error) {
    // Table doesn't exist yet or no settings found
    console.log('Settings not found')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} />

      <PullToRefresh onRefresh={async () => {
        'use server'
        const { revalidatePath } = await import('next/cache')
        revalidatePath('/organizer/settings')
      }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="mb-6 md:mb-8">
            <Link
              href="/organizer/events"
              className="text-orange-600 hover:text-orange-700 text-[13px] md:text-sm font-medium mb-2 inline-block"
            >
              ← Back to Events
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-[13px] md:text-sm text-gray-600 mt-1">Manage your payout preferences</p>
          </div>

          <PaymentSettingsForm initialSettings={settings} userId={user.id} />
        </div>
      </PullToRefresh>

      <MobileNavWrapper user={user} />
    </div>
  )
}
