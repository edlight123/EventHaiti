import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
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
    const { data } = await supabase
      .from('organizer_settings')
      .select('*')
      .eq('organizer_id', user.id)
      .single()
    
    settings = data
  } catch (error) {
    // Table doesn't exist yet or no settings found
    console.log('Settings not found')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">Manage your payout preferences</p>
          </div>
          <Link
            href="/organizer/events"
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            ← Back to Events
          </Link>
        </div>

        <PaymentSettingsForm initialSettings={settings} userId={user.id} />
      </div>
    </div>
  )
}
