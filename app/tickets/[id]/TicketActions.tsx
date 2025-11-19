'use client'

import { useState } from 'react'

interface TicketActionsProps {
  ticketId: string
  ticketStatus: string
  checkedIn: boolean
  eventTitle: string
}

export default function TicketActions({ ticketId, ticketStatus, checkedIn, eventTitle }: TicketActionsProps) {
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Transfer form state
  const [transferEmail, setTransferEmail] = useState('')
  const [transferMessage, setTransferMessage] = useState('')

  // Refund form state
  const [refundReason, setRefundReason] = useState('')

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/tickets/transfer/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          toEmail: transferEmail,
          message: transferMessage
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Transfer failed')
      }

      setMessage({ type: 'success', text: 'Transfer request sent! The recipient will receive an email.' })
      setTransferEmail('')
      setTransferMessage('')
      
      setTimeout(() => {
        setShowTransferModal(false)
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleRefundRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/refunds/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          reason: refundReason
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Refund request failed')
      }

      setMessage({ type: 'success', text: 'Refund request submitted! The organizer will review it.' })
      setRefundReason('')
      
      setTimeout(() => {
        setShowRefundModal(false)
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const canTransfer = ticketStatus === 'active' && !checkedIn
  const canRequestRefund = ticketStatus === 'active' && !checkedIn

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      {canTransfer && (
        <button
          onClick={() => setShowTransferModal(true)}
          className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
        >
          🔄 Transfer Ticket
        </button>
      )}

      {canRequestRefund && (
        <button
          onClick={() => setShowRefundModal(true)}
          className="w-full px-4 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition"
        >
          💰 Request Refund
        </button>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Transfer Ticket</h2>
            <p className="text-gray-600 mb-6">
              Send this ticket to someone else. They&apos;ll receive an email with a link to accept the transfer.
            </p>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={transferMessage}
                  onChange={(e) => setTransferMessage(e.target.value)}
                  placeholder="Hey! I'd like to give you my ticket for..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  maxLength={500}
                />
              </div>

              {message && (
                <div className={`p-3 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading || !transferEmail}
                >
                  {loading ? 'Sending...' : 'Send Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Refund</h2>
            <p className="text-gray-600 mb-6">
              Submit a refund request for {eventTitle}. The organizer will review your request.
            </p>

            <form onSubmit={handleRefundRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Refund
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Please explain why you need a refund..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  rows={4}
                  required
                  minLength={10}
                />
              </div>

              {message && (
                <div className={`p-3 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50"
                  disabled={loading || !refundReason}
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
