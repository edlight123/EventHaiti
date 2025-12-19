import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import WithdrawalsView from './WithdrawalsView'

export const metadata = {
  title: 'Withdrawal Management - EventHaiti Admin',
  description: 'Review and process organizer withdrawal requests'
}

export default async function AdminWithdrawalsPage() {
  const { user, error } = await requireAuth()
  if (error || !user) redirect('/auth/login?redirect=/admin/withdrawals')
  
  if (!isAdmin(user?.email)) {
    redirect('/organizer')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={true} />
      
      <WithdrawalsView />
      
      <MobileNavWrapper user={user} isAdmin={true} />
    </div>
  )
}
