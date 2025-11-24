import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import Navbar from '@/components/Navbar'
import TransferAcceptForm from './TransferAcceptForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TransferAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { user, error } = await requireAuth()

  if (error || !user) {
    const { token } = await params
    redirect(`/auth/login?redirect=/tickets/transfer/${token}`)
  }

  const { token } = await params

  // Get transfer request from Firestore
  const transfersQuery = await adminDb.collection('ticket_transfers')
    .where('transfer_token', '==', token)
    .limit(1)
    .get()

  if (transfersQuery.empty) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Transfer Not Found</h1>
            <p className="text-gray-600 mb-6">
              This transfer link is invalid or has expired.
            </p>
            <a
              href="/tickets"
              className="inline-block px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700"
            >
              View My Tickets
            </a>
          </div>
        </div>
      </div>
    )
  }

  const transferDoc = transfersQuery.docs[0]
  const transfer = { id: transferDoc.id, ...transferDoc.data() }

  // Check if transfer has expired
  if (transfer.expires_at && new Date(transfer.expires_at) < new Date()) {
    // Update status to expired
    await adminDb.collection('ticket_transfers').doc(transfer.id).update({
      status: 'expired',
      updated_at: new Date().toISOString()
    })

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">⏰</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Transfer Expired</h1>
            <p className="text-gray-600 mb-6">
              This transfer link expired on {new Date(transfer.expires_at).toLocaleString()}.
              <br />
              Transfer links are only valid for 24 hours.
            </p>
            <a
              href="/tickets"
              className="inline-block px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700"
            >
              View My Tickets
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Check if already responded to
  if (transfer.status !== 'pending') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">
              {transfer.status === 'accepted' ? '✅' : '❌'}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Transfer {transfer.status === 'accepted' ? 'Completed' : 'Cancelled'}
            </h1>
            <p className="text-gray-600 mb-6">
              This transfer has already been {transfer.status}.
            </p>
            <a
              href="/tickets"
              className="inline-block px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700"
            >
              View My Tickets
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Get ticket details
  const ticketDoc = await adminDb.collection('tickets').doc(transfer.ticket_id).get()
  
  if (!ticketDoc.exists) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Ticket Not Found</h1>
            <p className="text-gray-600">
              The ticket associated with this transfer no longer exists.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const ticket = ticketDoc.data()

  // Get event details
  const eventDoc = await adminDb.collection('events').doc(ticket?.event_id).get()
  const event = eventDoc.exists ? eventDoc.data() : null

  // Get sender details
  const senderDoc = await adminDb.collection('users').doc(transfer.from_user_id).get()
  const sender = senderDoc.exists ? senderDoc.data() : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <TransferAcceptForm
          transfer={transfer}
          ticket={ticket}
          event={event}
          sender={sender}
          currentUser={user}
        />
      </div>
    </div>
  )
}
