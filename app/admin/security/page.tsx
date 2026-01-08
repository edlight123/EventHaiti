import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import SecurityDashboardClient from './SecurityDashboardClient'

export const dynamic = 'force-dynamic'

export default async function SecurityDashboard() {
  const { user, error } = await requireAdmin()
  if (error || !user) {
    redirect('/auth/login?redirect=/admin/security')
  }
  return <SecurityDashboardClient />
}
