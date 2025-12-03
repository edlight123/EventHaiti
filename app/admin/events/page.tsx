import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { AdminEventsModerationConsole } from './AdminEventsModerationConsole'

export const revalidate = 60 // Cache for 1 minute

export default async function AdminEventsPage() {
  const { user, error } = await requireAuth()

  if (error || !user || !isAdmin(user?.email)) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={true} />
      <AdminEventsModerationConsole userId={user.id} userEmail={user.email!} />
      <MobileNavWrapper user={user} />
    </div>
  )
}
