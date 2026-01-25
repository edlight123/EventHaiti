import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import BankVerificationsClient from './BankVerificationsClient'

export const revalidate = 30

export default async function BankVerificationsPage() {
  return (
    <div>
      <AdminBreadcrumbs
        items={[
          { label: 'Verifications', href: '/admin/verifications' },
          { label: 'Bank Accounts' },
        ]}
      />
      <BankVerificationsClient />
    </div>
  )
}
