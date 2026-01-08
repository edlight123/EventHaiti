import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import SecurityDashboardClient from './SecurityDashboardClient'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'

export const dynamic = 'force-dynamic'

export default async function SecurityDashboard() {
  const { user, error } = await requireAdmin()
  if (error || !user) {
    redirect('/auth/login?redirect=/admin/security')
  }
  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={true} />
      <SecurityDashboardClient />
      <MobileNavWrapper user={user} isAdmin={true} />
    </div>
  )
}
