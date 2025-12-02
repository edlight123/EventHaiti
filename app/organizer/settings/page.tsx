import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PullToRefresh from '@/components/PullToRefresh'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { 
  User, 
  Building2, 
  Settings as SettingsIcon, 
  CreditCard, 
  ShieldCheck, 
  Users, 
  Bell, 
  Lock, 
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  HelpCircle,
  ChevronRight
} from 'lucide-react'

export const revalidate = 0

async function getOrganizerData(userId: string) {
  try {
    // Get organizer verification data
    const organizerDoc = await adminDb.collection('organizers').doc(userId).get()
    const organizerData = organizerDoc.exists ? organizerDoc.data() : null

    // Get payout config
    const payoutConfigDoc = await adminDb
      .collection('organizers')
      .doc(userId)
      .collection('payoutConfig')
      .doc('main')
      .get()
    
    const payoutConfig = payoutConfigDoc.exists ? payoutConfigDoc.data() : null

    return { organizerData, payoutConfig }
  } catch (error) {
    console.error('Error fetching organizer data:', error)
    return { organizerData: null, payoutConfig: null }
  }
}

export default async function OrganizerSettingsHubPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { organizerData, payoutConfig } = await getOrganizerData(user.id)

  // Calculate verification status
  const verificationStatus = organizerData?.verification_status || user.verification_status || 'none'
  const isVerified = verificationStatus === 'approved'
  const isPending = verificationStatus === 'pending'

  // Calculate payout status
  const payoutStatus = payoutConfig?.status || 'not_setup'
  const hasPayoutSetup = payoutStatus !== 'not_setup'

  // Default location (can be from organizer preferences)
  const defaultLocation = organizerData?.default_city || 'Not set'

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} />

      <PullToRefresh onRefresh={async () => {
        'use server'
        const { revalidatePath } = await import('next/cache')
        revalidatePath('/organizer/settings')
      }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <Link
              href="/organizer/events"
              className="text-teal-600 hover:text-teal-700 text-sm font-medium mb-2 inline-block"
            >
              ← Back to Events
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your organizer account</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Verification Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isVerified ? 'bg-green-100' : isPending ? 'bg-yellow-100' : 'bg-gray-100'
                }`}>
                  {isVerified ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : isPending ? (
                    <Clock className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Verification</p>
              <p className={`text-sm font-semibold mt-1 ${
                isVerified ? 'text-green-600' : isPending ? 'text-yellow-600' : 'text-gray-600'
              }`}>
                {isVerified ? 'Verified' : isPending ? 'Pending' : 'Not verified'}
              </p>
            </div>

            {/* Payout Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  hasPayoutSetup ? 'bg-teal-100' : 'bg-gray-100'
                }`}>
                  <CreditCard className={`w-5 h-5 ${hasPayoutSetup ? 'text-teal-600' : 'text-gray-400'}`} />
                </div>
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payouts</p>
              <p className={`text-sm font-semibold mt-1 ${hasPayoutSetup ? 'text-teal-600' : 'text-gray-600'}`}>
                {hasPayoutSetup ? 'Configured' : 'Not setup'}
              </p>
            </div>

            {/* Default Location */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Location</p>
              <p className="text-sm font-semibold mt-1 text-gray-900 truncate">{defaultLocation}</p>
            </div>

            {/* Support */}
            <Link
              href="/support"
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 hover:bg-teal-50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Need Help?</p>
              <p className="text-sm font-semibold mt-1 text-purple-600">Contact Support</p>
            </Link>
          </div>

          {/* Settings Sections */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h2>

            {/* Profile */}
            <Link
              href="/organizer/settings/profile"
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">Profile</h3>
                  <p className="text-sm text-gray-600 mt-0.5">Manage your name, email, and contact information</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </Link>

            {/* Organization/Brand */}
            <Link
              href="/organizer/settings/organization"
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">Organization & Brand</h3>
                  <p className="text-sm text-gray-600 mt-0.5">Business name, logo, and social links</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </Link>

            {/* Event Defaults */}
            <Link
              href="/organizer/settings/defaults"
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <SettingsIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">Event Defaults</h3>
                  <p className="text-sm text-gray-600 mt-0.5">Default location, timezone, and currency</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </Link>

            {/* Payments & Payouts */}
            <Link
              href="/organizer/settings/payouts"
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">Payments & Payouts</h3>
                  <p className="text-sm text-gray-600 mt-0.5">Bank account and payout preferences</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </Link>

            {/* Verification */}
            <Link
              href="/organizer/verify"
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    Verification
                    {!isVerified && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                        Action needed
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 mt-0.5">Identity and business verification</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </Link>

            {/* Team & Permissions */}
            <Link
              href="/organizer/settings/team"
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">Team & Permissions</h3>
                  <p className="text-sm text-gray-600 mt-0.5">Manage door staff and collaborators</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </Link>

            {/* Notifications */}
            <Link
              href="/organizer/settings/notifications"
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bell className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  <p className="text-sm text-gray-600 mt-0.5">Email, SMS, and WhatsApp preferences</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </Link>

            {/* Security */}
            <Link
              href="/organizer/settings/security"
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">Security</h3>
                  <p className="text-sm text-gray-600 mt-0.5">Password, 2FA, and login history</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </Link>

            {/* Danger Zone */}
            <Link
              href="/organizer/settings/danger-zone"
              className="block bg-white rounded-xl border border-red-200 p-4 hover:border-red-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-red-900">Danger Zone</h3>
                  <p className="text-sm text-gray-600 mt-0.5">Account deactivation and data export</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </Link>
          </div>
        </div>
      </PullToRefresh>

      <MobileNavWrapper user={user} />
    </div>
  )
}
