import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import VerifyOrganizerForm from './VerifyOrganizerForm'

export const revalidate = 0

export default async function AdminVerifyPage() {
  const user = await getCurrentUser()

  // Only allow specific admin users (you can add your email here)
  const ADMIN_EMAILS = ['admin@eventhaiti.com', 'your-email@example.com']
  
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    redirect('/')
  }

  const supabase = await createClient()
  
  // Fetch all organizers
  const allUsers = await supabase.from('users').select('*')
  const organizers = allUsers.data?.filter(u => u.role === 'organizer') || []

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Organizer Verification
          </h1>
          <p className="text-gray-600 mb-8">
            Manage verified status for event organizers
          </p>

          <VerifyOrganizerForm organizers={organizers} />
        </div>
      </div>
    </div>
  )
}
