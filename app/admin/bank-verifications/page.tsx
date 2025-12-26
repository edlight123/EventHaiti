import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { adminDb } from '@/lib/firebase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import BankVerificationReviewCard from '@/components/admin/BankVerificationReviewCard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface BankVerification {
  organizerId: string
  organizerName: string
  organizerEmail: string
  destinationId: string
  isPrimary?: boolean
  bankDetails: {
    accountName: string
    accountNumber: string
    bankName: string
    routingNumber?: string
  }
  verificationDoc: {
    type: string
    verificationType: string
    status: string
    submittedAt: string
    documentName: string
    documentSize: number
  }
}

export default async function AdminBankVerificationsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login?redirect=/admin/bank-verifications')
  }

  if (!isAdmin(user.email)) {
    redirect('/organizer')
  }

  // Fetch all bank verifications
  const bankVerifications: BankVerification[] = []

  // Get all organizers
  const usersSnapshot = await adminDb
    .collection('users')
    .where('role', '==', 'organizer')
    .get()

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data()
    const organizerId = userDoc.id

    // Pull all bank verification docs (supports per-destination ids: bank_<destinationId>, plus legacy id: bank).
    const bankVerificationDocsSnap = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('verificationDocuments')
      .where('type', '==', 'bank')
      .get()

    if (bankVerificationDocsSnap.empty) continue

    // Legacy fallback for bank details.
    const payoutConfigDocPromise = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payoutConfig')
      .doc('main')
      .get()

    const payoutConfigDoc = await payoutConfigDocPromise
    const legacyBankDetails = payoutConfigDoc.data()?.bankDetails

    for (const verificationDoc of bankVerificationDocsSnap.docs) {
      const verificationData = verificationDoc.data() as any
      const docId = String(verificationDoc.id || '')

      const destinationId = (() => {
        if (verificationData?.destinationId) return String(verificationData.destinationId)
        if (docId.startsWith('bank_')) return docId.slice('bank_'.length)
        // Legacy doc id "bank" historically implied the main/primary bank.
        if (docId === 'bank') return 'bank_primary'
        return ''
      })()

      if (!destinationId) continue

      const destinationDoc = await adminDb
        .collection('organizers')
        .doc(organizerId)
        .collection('payoutDestinations')
        .doc(destinationId)
        .get()

      const destinationData = destinationDoc.exists ? (destinationDoc.data() as any) : null

      const bankDetails = destinationData
        ? {
            accountName: String(destinationData.accountName || ''),
            accountNumber: destinationData.accountNumberLast4
              ? `****${String(destinationData.accountNumberLast4)}`
              : '****',
            bankName: String(destinationData.bankName || ''),
            routingNumber: undefined,
          }
        : legacyBankDetails

      if (!bankDetails) continue

      bankVerifications.push({
        organizerId,
        organizerName: userData.full_name || userData.email || 'Unknown',
        organizerEmail: userData.email || '',
        destinationId,
        isPrimary: Boolean(destinationData?.isPrimary) || destinationId === 'bank_primary',
        bankDetails,
        verificationDoc: {
          type: String(verificationData.type || 'bank'),
          verificationType: String(verificationData.verificationType || ''),
          status: String(verificationData.status || 'pending'),
          submittedAt: String(verificationData.submittedAt || ''),
          documentName: String(verificationData.documentName || ''),
          documentSize: Number(verificationData.documentSize || 0),
        },
      })
    }
  }

  // Sort by submission date (newest first)
  bankVerifications.sort((a, b) => 
    new Date(b.verificationDoc.submittedAt).getTime() - new Date(a.verificationDoc.submittedAt).getTime()
  )

  // Filter by status
  const pending = bankVerifications.filter(v => v.verificationDoc.status === 'pending')
  const verified = bankVerifications.filter(v => v.verificationDoc.status === 'verified')
  const failed = bankVerifications.filter(v => v.verificationDoc.status === 'failed')

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={true} />

      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 border-b border-purple-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-4">
            <Link href="/admin" className="inline-flex items-center gap-2 px-4 py-2 text-purple-100 hover:text-white hover:bg-purple-700 rounded-lg transition-colors text-sm font-medium">
              <span>←</span>
              <span>Back to Admin</span>
            </Link>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Bank Verifications</h1>
              <p className="text-purple-100 text-sm sm:text-base max-w-2xl">
                Review and approve organizer bank account verifications
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-purple-500/30 backdrop-blur-sm rounded-xl p-4">
              <div className="text-purple-100 text-sm font-medium">Pending</div>
              <div className="text-white text-3xl font-bold mt-1">{pending.length}</div>
            </div>
            <div className="bg-green-500/30 backdrop-blur-sm rounded-xl p-4">
              <div className="text-green-100 text-sm font-medium">Verified</div>
              <div className="text-white text-3xl font-bold mt-1">{verified.length}</div>
            </div>
            <div className="bg-red-500/30 backdrop-blur-sm rounded-xl p-4">
              <div className="text-red-100 text-sm font-medium">Failed</div>
              <div className="text-white text-3xl font-bold mt-1">{failed.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pending Verifications */}
        {pending.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Pending Review ({pending.length})
            </h2>
            <div className="space-y-4">
              {pending.map((verification) => (
                <BankVerificationReviewCard
                  key={verification.organizerId}
                  verification={verification}
                />
              ))}
            </div>
          </div>
        )}

        {/* Verified */}
        {verified.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Verified ({verified.length})
            </h2>
            <div className="space-y-4">
              {verified.map((verification) => (
                <BankVerificationReviewCard
                  key={verification.organizerId}
                  verification={verification}
                />
              ))}
            </div>
          </div>
        )}

        {/* Failed */}
        {failed.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Failed ({failed.length})
            </h2>
            <div className="space-y-4">
              {failed.map((verification) => (
                <BankVerificationReviewCard
                  key={verification.organizerId}
                  verification={verification}
                />
              ))}
            </div>
          </div>
        )}

        {bankVerifications.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No verifications yet</h3>
            <p className="text-gray-600">Bank verification requests will appear here when organizers submit them.</p>
          </div>
        )}
      </div>

      <MobileNavWrapper user={user} isAdmin={true} />
    </div>
  )
}
