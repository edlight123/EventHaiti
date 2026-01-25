import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { AdminCommandBar } from '@/components/admin/AdminCommandBar'
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminRealtimeProvider } from '@/lib/realtime/AdminRealtimeProvider'

// Allow some caching to avoid full page reloads
export const revalidate = 30

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      redirect('/auth/login?redirect=/admin')
    }

    const { error } = await requireAdmin()
    if (error) {
      return <AdminAccessDenied userEmail={user.email} />
    }

    return (
      <AdminRealtimeProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar user={user} isAdmin={true} />
          
          {/* Command Bar - Global Search & Quick Actions */}
          <AdminCommandBar />
          
          <div className="flex">
            {/* Sidebar - Desktop Only - fetches its own badge data */}
            <AdminSidebar userEmail={user.email} />
            
            {/* Main Content */}
            <main className="flex-1 pb-mobile-nav">
              {children}
            </main>
          </div>
          
          {/* Mobile Bottom Navigation */}
          <MobileNavWrapper user={user} isAdmin={true} />
        </div>
      </AdminRealtimeProvider>
    )
  } catch (error) {
    console.error('Admin layout error:', error)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Admin Error</h1>
          <p className="text-gray-600">
            Failed to load admin area. Please try again or contact support if the problem persists.
          </p>
        </div>
      </div>
    )
  }
}
