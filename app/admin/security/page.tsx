import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import SecurityDashboardClient from './SecurityDashboardClient'

export const dynamic = 'force-dynamic'

export default async function SecurityDashboard() {
  return (
    <div className="p-6 space-y-6">
      <AdminBreadcrumbs 
        items={[
          { label: 'Security', href: '/admin/security' }
        ]} 
      />
      <SecurityDashboardClient />
    </div>
  )
}
