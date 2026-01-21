import { PlatformSettingsForm } from './PlatformSettingsForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminSettingsPage() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
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
  )
}
