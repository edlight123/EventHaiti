'use client'

import { useState } from 'react'

export default function CheckInScanner({ eventId }: { eventId: string }) {
  const [ticketId, setTicketId] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, eventId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Check-in failed')
      }

      setMessage({ type: 'success', text: `✓ Checked in: ${data.attendee}` })
      setTicketId('')
      
      // Refresh the page after successful check-in
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="bg-gray-100 rounded-xl p-8 mb-4 text-center">
        <div className="inline-flex items-center justify-center w-48 h-48 bg-white rounded-2xl border-4 border-dashed border-gray-300">
          <div className="text-gray-400">
            <svg className="w-24 h-24 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <p className="text-sm">QR Scanner</p>
            <p className="text-xs mt-1">Camera access required</p>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500 mb-4">
        or enter ticket ID manually
      </div>

      <form onSubmit={handleCheckIn} className="space-y-4">
        <input
          type="text"
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          placeholder="Enter ticket ID"
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />

        {message && (
          <div className={`p-4 rounded-xl ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !ticketId}
          className="w-full px-6 py-3 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Checking in...' : 'Check In'}
        </button>
      </form>
    </div>
  )
}
