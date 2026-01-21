import Link from 'next/link'
import { AdminRevenueAnalytics } from '@/components/admin/AdminRevenueAnalytics'

export const revalidate = 120
export const dynamic = 'force-dynamic'

export default async function AdminAnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      <div className="mb-4 sm:mb-6">
        <Link href="/admin" className="text-teal-600 hover:text-teal-700 text-sm font-medium">
          ← Back to Admin Dashboard
        </Link>
      </div>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-600 mt-2">Platform insights and performance metrics</p>
      </div>

      {/* Multi-Currency Revenue Analytics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue Analytics (Multi-Currency)</h2>
        <AdminRevenueAnalytics />
      </div>
    </div>
  )
}
