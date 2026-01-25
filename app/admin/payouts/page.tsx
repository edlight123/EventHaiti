import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Payout Operations | Admin | EventHaiti',
  description: 'Redirecting to consolidated payout operations',
}


export default async function AdminPayoutsPage() {
  // Redirect to the consolidated payout operations page
  redirect('/admin/disbursements')
}
