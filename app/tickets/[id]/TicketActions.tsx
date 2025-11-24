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
  const [transferLink, setTransferLink] = useState('')
  const [showTransferLink, setShowTransferLink] = useState(false)

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

      // Generate transfer link if token is returned
      if (data.transfer?.transferToken) {
        const link = `${window.location.origin}/tickets/transfer/${data.transfer.transferToken}`
        setTransferLink(link)
        setShowTransferLink(true)
      }

      setMessage({ type: 'success', text: 'Transfer request sent! The recipient will receive an email.' })
      setTransferEmail('')
      setTransferMessage('')
      
      // Don't auto-close modal if we're showing the transfer link
      if (!showTransferLink) {
        setTimeout(() => {
          setShowTransferModal(false)
          window.location.reload()
        }, 2000)
      }
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

  const canTransfer = (ticketStatus === 'active' || ticketStatus === 'valid') && !checkedIn
  const canRequestRefund = (ticketStatus === 'active' || ticketStatus === 'valid') && !checkedIn

  const handleCopyLink = async () => {
    const ticketUrl = `${window.location.origin}/tickets/${ticketId}`
    try {
      await navigator.clipboard.writeText(ticketUrl)
      setMessage({ type: 'success', text: 'Link copied to clipboard!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to copy link' })
    }
  }

  const handleShareWhatsApp = () => {
    const ticketUrl = `${window.location.origin}/tickets/${ticketId}`
    const text = `Check out my ticket for ${eventTitle}!`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + ticketUrl)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleShareFacebook = () => {
    const ticketUrl = `${window.location.origin}/tickets/${ticketId}`
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ticketUrl)}`
    window.open(facebookUrl, '_blank', 'width=600,height=400')
  }

  const handleShareTwitter = () => {
    const ticketUrl = `${window.location.origin}/tickets/${ticketId}`
    const text = `Got my ticket for ${eventTitle}! 🎉`
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(ticketUrl)}`
    window.open(twitterUrl, '_blank', 'width=600,height=400')
  }

  const handleShareInstagram = async () => {
    // Instagram doesn't support direct web sharing, so we'll copy the link and guide users
    await handleCopyLink()
    
    // Try to open Instagram app on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      // Attempt to open Instagram app
      window.location.href = 'instagram://'
      setTimeout(() => {
        setMessage({ 
          type: 'success', 
          text: 'Link copied! Paste it in your Instagram story or post.' 
        })
      }, 1000)
    } else {
      setMessage({ 
        type: 'success', 
        text: 'Link copied! Open Instagram and paste the link in your story or post.' 
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Share Buttons */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Share Your Ticket</h4>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            WhatsApp
          </button>

          <button
            onClick={handleShareInstagram}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white font-medium rounded-lg hover:opacity-90 transition"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Instagram
          </button>

          <button
            onClick={handleShareFacebook}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </button>

          <button
            onClick={handleShareTwitter}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            X (Twitter)
          </button>
        </div>

        <button
          onClick={handleCopyLink}
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition border border-gray-300"
        >
          📋 Copy Ticket Link
        </button>
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
            
            {!showTransferLink ? (
              <>
                <p className="text-gray-600 mb-6">
                  Send this ticket to someone else. They&apos;ll receive an email with a link to accept the transfer.
                  <span className="block mt-2 text-sm text-amber-600 font-medium">
                    ⏰ Transfer links expire in 24 hours
                  </span>
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
                      onClick={() => {
                        setShowTransferModal(false)
                        setShowTransferLink(false)
                        setTransferLink('')
                      }}
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
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  ✅ Transfer request created! Share this link with the recipient:
                </p>

                <div className="space-y-3 mb-6">
                  {/* Copy Link */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={transferLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                    />
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(transferLink)
                        setMessage({ type: 'success', text: 'Link copied!' })
                        setTimeout(() => setMessage(null), 2000)
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      📋 Copy
                    </button>
                  </div>

                  {/* Share via WhatsApp */}
                  <button
                    onClick={() => {
                      const text = `I'm transferring my ticket for ${eventTitle} to you! Click here to accept:`
                      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + transferLink)}`
                      window.open(whatsappUrl, '_blank')
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    Share via WhatsApp
                  </button>

                  {/* Share via SMS */}
                  <button
                    onClick={() => {
                      const text = `I'm transferring my ticket for ${eventTitle}. Accept it here: ${transferLink}`
                      window.location.href = `sms:?&body=${encodeURIComponent(text)}`
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition"
                  >
                    💬 Share via Text Message
                  </button>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-amber-800">
                    <strong>⏰ Reminder:</strong> This transfer link expires in 24 hours. The recipient must accept before then.
                  </p>
                </div>

                {message && (
                  <div className={`p-3 rounded-lg mb-4 ${
                    message.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    {message.text}
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowTransferModal(false)
                    setShowTransferLink(false)
                    setTransferLink('')
                    window.location.reload()
                  }}
                  className="w-full px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700"
                >
                  Done
                </button>
              </>
            )}
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
