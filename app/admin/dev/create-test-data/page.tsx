import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import CreateTestDataClient from './CreateTestDataClient'

export const dynamic = 'force-dynamic'

export default function CreateTestDataPage() {
  return (
    <div className="p-6 space-y-6">
      <AdminBreadcrumbs 
        items={[
          { label: 'Dev Tools', href: '/admin/dev' },
          { label: 'Test Data', href: '/admin/dev/create-test-data' }
        ]} 
      />
      <CreateTestDataClient />
    </div>
  )
}
