import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import SeedEventsClient from './SeedEventsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function SeedEventsPage() {
  return (
    <div className="p-6 space-y-6">
      <AdminBreadcrumbs 
        items={[
          { label: 'Dev Tools', href: '/admin/dev' },
          { label: 'Seed Events', href: '/admin/dev/seed-events' }
        ]} 
      />
      <SeedEventsClient />
    </div>
  )
}
