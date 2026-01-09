import { requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { getUserCounts } from '@/lib/data/users'
import AdminUsersClient from './AdminUsersClient'

export const revalidate = 60 // Cache for 1 minute

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage({
}: {
}) {
  const { user, error } = await requireAdmin()

  if (error || !user) {
    redirect('/')
  }

  const counts = await getUserCounts()

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={true} />

      <AdminUsersClient counts={counts} />

      <MobileNavWrapper user={user} isAdmin={true} />
    </div>
  )
}