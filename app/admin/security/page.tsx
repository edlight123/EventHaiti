import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import SecurityDashboardClient from './SecurityDashboardClient'

export default async function SecurityDashboard() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login?redirect=/admin/security')
  }
  if (!isAdmin(user.email)) {
    redirect('/organizer')
  }
  return <SecurityDashboardClient />
}
