import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Withdrawal Management - EventHaiti Admin',
  description: 'Review and process organizer withdrawal requests'
}

export default function AdminWithdrawalsPage() {
  redirect('/admin/disbursements#withdrawals')
}
