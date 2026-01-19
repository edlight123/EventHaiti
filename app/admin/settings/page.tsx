import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied'
import { PlatformSettingsForm } from './PlatformSettingsForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminSettingsPage() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      redirect('/auth/login?redirect=/admin/settings')
    }

    const { error } = await requireAdmin()
    if (error) {
      return <AdminAccessDenied userEmail={user.email} />
    }

    return (
      <>
        <Navbar />
        <MobileNavWrapper />
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Platform Settings
                  </h1>
                  <p className="mt-2 text-gray-600">
                    Configure platform fees and settlement times for different regions
                  </p>
                </div>
              </div>
            </div>

            {/* Settings Form */}
            <PlatformSettingsForm />
          </div>
        </div>
      </>
    )
  } catch (error) {
    console.error('Error loading admin settings page:', error)
    return (
      <>
        <Navbar />
        <MobileNavWrapper />
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">
                Failed to load settings page. Please try again.
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }
}
