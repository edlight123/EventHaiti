import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { redirect } from 'next/navigation'
import TicketScanner from './TicketScanner'

export default async function ScanTicketPage() {
  const { user, error } = await requireAuth('organizer')

  if (error || !user) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Scan Tickets</h1>
          <p className="text-gray-600">
            Enter or paste the ticket QR code data to validate tickets at the door.
          </p>
        </div>

        <TicketScanner organizerId={user.id} />

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">📱 How to validate tickets</h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Ask attendees to show their QR code ticket</li>
            <li>The QR code contains data in format: ticket:[id]|event:[id]</li>
            <li>Enter or paste the QR code data in the field above</li>
            <li>Click "Validate Ticket" to check and mark as used</li>
            <li>A green message means valid, red means invalid or already used</li>
          </ol>
          <div className="mt-4 p-3 bg-blue-100 rounded text-xs text-blue-900">
            <strong>Note for MVP:</strong> For real QR scanning with camera, future versions can integrate browser APIs or mobile scanning apps.
          </div>
        </div>
      </div>
    </div>
  )
}
