'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { isDemoMode } from '@/lib/demo'

interface BuyTicketButtonProps {
  eventId: string
  userId: string
}

export default function BuyTicketButton({ eventId, userId }: BuyTicketButtonProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePurchase() {
    setLoading(true)
    setError(null)

    try {
      // In demo mode, just show success message
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 800)) // Simulate API call
        setShowModal(false)
        alert('✅ Demo: Ticket purchased successfully! In production, this would create a real ticket.')
        router.refresh()
        setLoading(false)
        return
      }

      // Generate QR code data
      const ticketId = crypto.randomUUID()
      const qrCodeData = `ticket:${ticketId}|event:${eventId}`

      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          id: ticketId,
          event_id: eventId,
          attendee_id: userId,
          qr_code_data: qrCodeData,
          status: 'active',
        })
        .select()
        .single()

      if (ticketError) throw ticketError

      // Increment tickets_sold
      const { error: updateError } = await supabase.rpc('increment_tickets_sold', {
        event_id: eventId,
      })

      // If RPC doesn't exist, do it manually
      if (updateError) {
        const { data: event } = await supabase
          .from('events')
          .select('tickets_sold')
          .eq('id', eventId)
          .single()

        if (event) {
          await supabase
            .from('events')
            .update({ tickets_sold: event.tickets_sold + 1 })
            .eq('id', eventId)
        }
      }

      // Redirect to ticket detail
      router.push(`/tickets/${ticketId}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to purchase ticket')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="block w-full bg-teal-700 hover:bg-teal-800 text-white text-center font-semibold py-4 px-6 rounded-lg transition-colors"
      >
        Buy Ticket
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Purchase</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to buy this ticket? This is a simulated purchase for MVP.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
