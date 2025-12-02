import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import AdminPayoutQueue from './AdminPayoutQueue'

export const metadata = {
  title: 'Manage Payouts | Admin | EventHaiti',
  description: 'Review and process organizer payout requests',
}

async function getPendingPayouts() {
  try {
    // Query all pending payouts across all organizers (collectionGroup)
    const payoutsSnapshot = await adminDb
      .collectionGroup('payouts')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(100)
      .get()

    const payouts = await Promise.all(
      payoutsSnapshot.docs.map(async (doc: any) => {
        const data = doc.data()
        const organizerId = data.organizerId

        // Fetch organizer details
        const organizerDoc = await adminDb.collection('users').doc(organizerId).get()
        const organizerData = organizerDoc.data()

        // Fetch payout config for payment method details
        const configDoc = await adminDb
          .collection('organizers')
          .doc(organizerId)
          .collection('payoutConfig')
          .doc('main')
          .get()
        const config = configDoc.data()

        return {
          id: doc.id,
          ...data,
          organizer: {
            id: organizerId,
            name: organizerData?.full_name || 'Unknown',
            email: organizerData?.email || '',
          },
          payoutConfig: config || {},
        }
      })
    )

    return payouts
  } catch (error) {
    console.error('Error fetching pending payouts:', error)
    return []
  }
}

export default async function AdminPayoutsPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'admin') {
    redirect('/auth/login')
  }

  const pendingPayouts = await getPendingPayouts()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payout Management</h1>
          <p className="mt-2 text-gray-600">
            Review and process organizer payout requests
          </p>
        </div>

        <AdminPayoutQueue initialPayouts={pendingPayouts} />
      </div>
    </div>
  )
}
