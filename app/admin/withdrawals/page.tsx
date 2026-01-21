import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Withdrawal Management | Admin | EventHaiti',
  description: 'Redirecting to consolidated payout operations - withdrawal history',
}

export const dynamic = 'force-dynamic'

export default function AdminWithdrawalsPage() {
  redirect('/admin/disbursements#withdrawals')
}
