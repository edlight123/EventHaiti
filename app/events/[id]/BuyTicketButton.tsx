'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { firebaseDb as supabase } from '@/lib/firebase-db/client'
import { isDemoMode } from '@/lib/demo'
import TieredTicketSelector from '@/components/TieredTicketSelector'
import BottomSheet from '@/components/ui/BottomSheet'
import { useToast } from '@/components/ui/Toast'
import dynamic from 'next/dynamic'

const EmbeddedStripePayment = dynamic(() => import('./EmbeddedStripePayment'), { ssr: false })

interface BuyTicketButtonProps {
  eventId: string
  userId: string
  isFree: boolean
  ticketPrice: number
  eventTitle?: string
  currency?: string
}

export default function BuyTicketButton({ eventId, userId, isFree, ticketPrice, eventTitle = 'Event', currency = 'HTG' }: BuyTicketButtonProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [showModal, setShowModal] = useState(false)
  const [showTieredModal, setShowTieredModal] = useState(false)
  const [showEmbeddedPayment, setShowEmbeddedPayment] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'moncash'>('stripe')
  const [quantity, setQuantity] = useState(1)
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const [selectedTierPrice, setSelectedTierPrice] = useState<number>(0)
  const [promoCode, setPromoCode] = useState<string | undefined>()

  async function handleClaimFreeTicket() {
    setLoading(true)
    setError(null)

    try {
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 800))
        showToast({
          type: 'success',
          title: 'Free ticket claimed!',
          message: `${quantity} ticket${quantity !== 1 ? 's' : ''} added to your collection`,
          duration: 4000
        })
        router.push('/tickets')
        return
      }

      console.log('Claiming free tickets for event:', eventId, 'Quantity:', quantity)
      
      const response = await fetch('/api/tickets/claim-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, quantity }),
      })

      const data = await response.json()
      
      console.log('Claim response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim ticket')
      }

      // Show success toast and redirect
      showToast({
        type: 'success',
        title: 'Tickets claimed successfully!',
        message: `${data.count} free ticket${data.count !== 1 ? 's' : ''} added to your collection`,
        duration: 4000
      })
      
      router.push('/tickets')
      router.refresh()
    } catch (err: any) {
      console.error('Claim error:', err)
      setError(err.message || 'Failed to claim ticket')
      showToast({
        type: 'error',
        title: 'Failed to claim ticket',
        message: err.message || 'Please try again later',
        duration: 4000
      })
      setLoading(false)
    }
  }

  async function handlePurchase(method: 'stripe' | 'moncash') {
    setLoading(true)
    setError(null)

    try {
      // In demo mode, just show success message
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 800))
        setShowModal(false)
        setShowTieredModal(false)
        showToast({
          type: 'success',
          title: 'Tickets purchased!',
          message: `${quantity} ticket${quantity !== 1 ? 's' : ''} successfully purchased`,
          duration: 4000
        })
        router.refresh()
        setLoading(false)
        return
      }

      if (method === 'stripe') {
        // Use embedded payment instead of redirect
        setShowModal(false)
        setShowEmbeddedPayment(true)
        setLoading(false)
      } else {
        // Create MonCash payment
        const response = await fetch('/api/moncash/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            eventId, 
            quantity,
            tierId: selectedTierId,
            tierPrice: selectedTierPrice,
            promoCode,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to initiate MonCash payment')
        }

        // Redirect to MonCash payment page
        if (data.paymentUrl) {
          showToast({
            type: 'info',
            title: 'Redirecting to payment...',
            message: 'You will be redirected to MonCash',
            duration: 3000
          })
          window.location.href = data.paymentUrl
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to purchase ticket')
      showToast({
        type: 'error',
        title: 'Purchase failed',
        message: err.message || 'Please try again later',
        duration: 4000
      })
      setLoading(false)
    }
  }

  const handleTieredPurchase = (tierId: string, tierPrice: number, qty: number, promo?: string) => {
    setSelectedTierId(tierId)
    setSelectedTierPrice(tierPrice)
    setQuantity(qty)
    setPromoCode(promo)
    setShowTieredModal(false)
    setShowModal(true)
  }

  return (
    <>
      {isFree ? (
        <div className="space-y-4">
          {/* Quantity Selector for Free Tickets */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <span className="text-sm font-medium text-gray-700">Quantity</span>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1 || loading}
                className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="w-12 text-center font-semibold text-gray-900">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                disabled={quantity >= 10 || loading}
                className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          <button
            onClick={handleClaimFreeTicket}
            disabled={loading}
            className="block w-full bg-teal-700 hover:bg-teal-800 text-white text-center font-semibold py-2.5 px-5 rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {loading ? 'Processing...' : `Claim ${quantity} Free Ticket${quantity !== 1 ? 's' : ''}`}
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => setShowTieredModal(true)}
            disabled={loading}
            className="block w-full bg-teal-700 hover:bg-teal-800 text-white text-center font-semibold py-2.5 px-5 rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {loading ? 'Processing...' : 'Buy Ticket'}
          </button>

          {/* Tiered Ticket Selection Modal */}
          {showTieredModal && (
            <BottomSheet 
              isOpen={showTieredModal} 
              onClose={() => setShowTieredModal(false)}
              title="Select Tickets"
            >
              <TieredTicketSelector
                eventId={eventId}
                userId={userId}
                onPurchase={handleTieredPurchase}
              />
            </BottomSheet>
          )}
        </>
      )}

      {error && !showModal && (
        <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {showModal && !isFree && (
        <BottomSheet 
          isOpen={showModal} 
          onClose={() => setShowModal(false)}
          title="Choose Payment Method"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Select how you&apos;d like to pay for your {quantity} ticket{quantity !== 1 ? 's' : ''}
            </p>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <span className="text-sm font-medium text-gray-700">Quantity</span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || loading}
                  className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="w-12 text-center font-semibold text-gray-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(10, quantity + 1))}
                  disabled={quantity >= 10 || loading}
                  className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="bg-teal-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Amount:</span>
                <span className="text-xl font-bold text-teal-700">
                  {((selectedTierPrice || ticketPrice) * quantity).toLocaleString()} HTG
                </span>
              </div>
              {promoCode && (
                <div className="mt-2 text-sm text-green-600">
                  ✓ Promo code {promoCode} applied
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              {/* Stripe Option */}
              <button
                onClick={() => handlePurchase('stripe')}
                disabled={loading}
                className="w-full flex items-center justify-between px-4 py-4 border-2 border-gray-200 rounded-lg hover:border-teal-600 hover:bg-teal-50 transition disabled:opacity-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Credit/Debit Card</div>
                    <div className="text-sm text-gray-500">Visa, Mastercard, Amex</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* MonCash Option */}
              <button
                onClick={() => handlePurchase('moncash')}
                disabled={loading}
                className="w-full flex items-center justify-between px-4 py-4 border-2 border-gray-200 rounded-lg hover:border-teal-600 hover:bg-teal-50 transition disabled:opacity-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">MonCash</div>
                    <div className="text-sm text-gray-500">Mobile money (Haiti)</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => setShowModal(false)}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Cancel'}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Embedded Stripe Payment */}
      {showEmbeddedPayment && (
        <EmbeddedStripePayment
          eventId={eventId}
          eventTitle={eventTitle}
          userId={userId}
          quantity={quantity}
          totalAmount={(selectedTierPrice || ticketPrice) * quantity}
          currency={currency}
          tierId={selectedTierId || undefined}
          promoCodeId={promoCode}
          onClose={() => {
            setShowEmbeddedPayment(false)
            // Reset state
            setQuantity(1)
            setSelectedTierId(null)
            setSelectedTierPrice(0)
            setPromoCode(undefined)
          }}
        />
      )}
    </>
  )
}
