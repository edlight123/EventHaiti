import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import DebugDBClient from './DebugDBClient'

export const dynamic = 'force-dynamic'

export default function DebugDBPage() {
  return (
    <div className="p-6 space-y-6">
      <AdminBreadcrumbs 
        items={[
          { label: 'Dev Tools', href: '/admin/dev' },
          { label: 'Database Debug', href: '/admin/dev/debug-db' }
        ]} 
      />
      <DebugDBClient />
    </div>
  )
}
