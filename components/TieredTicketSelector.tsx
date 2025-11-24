'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface TicketTier {
  id: string
  name: string
  description: string | null
  price: number
  total_quantity: number
  sold_quantity: number
  sales_start: string | null
  sales_end: string | null
}

interface GroupDiscount {
  id: string
  min_quantity: number
  discount_percentage: number
  is_active: boolean
}

interface TieredTicketSelectorProps {
  eventId: string
  userId: string | null
  onPurchase: (tierId: string, tierPrice: number, quantity: number, promoCode?: string) => void
}

export default function TieredTicketSelector({ eventId, userId, onPurchase }: TieredTicketSelectorProps) {
  const router = useRouter()
  const [tiers, setTiers] = useState<TicketTier[]>([])
  const [groupDiscounts, setGroupDiscounts] = useState<GroupDiscount[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState<any>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')

  useEffect(() => {
    fetchTiers()
    fetchGroupDiscounts()
  }, [eventId])

  const fetchTiers = async () => {
    try {
      const response = await fetch(`/api/ticket-tiers?eventId=${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch tiers')
      const data = await response.json()
      setTiers(data.tiers || [])
      
      // Auto-select first available tier
      if (data.tiers && data.tiers.length > 0) {
        const firstAvailable = data.tiers.find((t: TicketTier) => 
          (t.total_quantity - (t.sold_quantity || 0)) > 0 && isTierAvailable(t)
        )
        if (firstAvailable) {
          setSelectedTier(firstAvailable.id)
        }
      }
    } catch (error) {
      console.error('Error fetching tiers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGroupDiscounts = async () => {
    try {
      const response = await fetch(`/api/group-discounts?eventId=${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch group discounts')
      const data = await response.json()
      setGroupDiscounts(data.discounts || [])
    } catch (error) {
      console.error('Error fetching group discounts:', error)
    }
  }

  const isTierAvailable = (tier: TicketTier): boolean => {
    const now = new Date()
    
    if (tier.sales_start && new Date(tier.sales_start) > now) {
      return false
    }
    
    if (tier.sales_end && new Date(tier.sales_end) < now) {
      return false
    }
    
    return (tier.total_quantity - (tier.sold_quantity || 0)) > 0
  }

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return

    setPromoLoading(true)
    setPromoError('')
    setPromoApplied(null)

    try {
      const response = await fetch(`/api/promo-codes?eventId=${eventId}&code=${encodeURIComponent(promoCode.trim())}`)
      const data = await response.json()

      if (!response.ok || !data.valid) {
        throw new Error(data.error || 'Invalid promo code')
      }

      setPromoApplied(data.promoCode)
    } catch (error: any) {
      setPromoError(error.message || 'Failed to apply promo code')
    } finally {
      setPromoLoading(false)
    }
  }

  const calculateFinalPrice = (): number => {
    const tier = tiers.find(t => t.id === selectedTier)
    if (!tier) return 0

    let price = tier.price

    // Apply promo code discount first
    if (promoApplied) {
      if (promoApplied.discountType === 'percentage') {
        price = price * (1 - promoApplied.discountValue / 100)
      } else if (promoApplied.discountType === 'fixed') {
        price = Math.max(0, price - promoApplied.discountValue)
      }
    }

    // Apply group discount if applicable (after promo)
    const applicableGroupDiscount = getApplicableGroupDiscount()
    if (applicableGroupDiscount && !promoApplied) {
      price = price * (1 - applicableGroupDiscount.discount_percentage / 100)
    }

    return price
  }

  const getApplicableGroupDiscount = (): GroupDiscount | null => {
    if (groupDiscounts.length === 0) return null
    
    // Find the best discount that applies to current quantity
    const applicable = groupDiscounts
      .filter(d => quantity >= d.min_quantity)
      .sort((a, b) => b.discount_percentage - a.discount_percentage)
    
    return applicable.length > 0 ? applicable[0] : null
  }

  const handlePurchase = () => {
    if (!selectedTier || !userId) return

    const finalPrice = calculateFinalPrice()
    onPurchase(selectedTier, finalPrice, quantity, promoApplied?.code)
  }

  if (loading) {
    return <p className="text-gray-600">Loading ticket options...</p>
  }

  if (tiers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">No ticket tiers available for this event.</p>
        <p className="text-sm text-gray-500">The organizer hasn&apos;t created ticket tiers yet. Please use the standard ticket purchase option.</p>
      </div>
    )
  }

  const selectedTierData = tiers.find(t => t.id === selectedTier)
  const finalPrice = calculateFinalPrice()
  const totalPrice = finalPrice * quantity

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Select Ticket Tier</h3>

      {/* Tier Selection */}
      <div className="space-y-2">
        {tiers.map((tier) => {
          const available = tier.total_quantity - (tier.sold_quantity || 0)
          const isAvailable = isTierAvailable(tier)
          const isSelected = selectedTier === tier.id

          return (
            <div
              key={tier.id}
              onClick={() => isAvailable && setSelectedTier(tier.id)}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-teal-600 bg-teal-50'
                  : isAvailable
                  ? 'border-gray-200 hover:border-teal-300'
                  : 'border-gray-200 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">{tier.name}</h4>
                    {isSelected && <span className="text-teal-600">✓</span>}
                  </div>
                  {tier.description && (
                    <p className="text-sm text-gray-600 mt-1">{tier.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="font-medium text-teal-600">
                      {tier.price.toFixed(2)} HTG
                    </span>
                    <span className={available > 0 ? 'text-gray-600' : 'text-red-600'}>
                      {available > 0 ? `${available} available` : 'Sold out'}
                    </span>
                  </div>
                  {!isAvailable && available > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      {tier.sales_start && new Date(tier.sales_start) > new Date()
                        ? `Sales start ${new Date(tier.sales_start).toLocaleDateString()}`
                        : `Sales ended ${new Date(tier.sales_end!).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quantity Selector */}
      {selectedTierData && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity
          </label>
          {groupDiscounts.length > 0 && (
            <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm font-medium text-orange-800 mb-1">🎟️ Group Discounts Available:</p>
              <ul className="text-sm text-orange-700 space-y-1">
                {groupDiscounts
                  .sort((a, b) => a.min_quantity - b.min_quantity)
                  .map(d => (
                    <li key={d.id}>
                      Buy {d.min_quantity}+ tickets → Save {d.discount_percentage}%
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <select
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
          >
            {[...Array(Math.min(10, selectedTierData.total_quantity - (selectedTierData.sold_quantity || 0)))].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Promo Code */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Promo Code (optional)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value.toUpperCase())
              setPromoApplied(null)
              setPromoError('')
            }}
            placeholder="Enter code"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={handleApplyPromo}
            disabled={promoLoading || !promoCode.trim()}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300"
          >
            {promoLoading ? 'Checking...' : 'Apply'}
          </button>
        </div>
        {promoApplied && (
          <p className="text-sm text-green-600 mt-1">
            ✓ Promo code applied: {promoApplied.discountType === 'percentage' 
              ? `${promoApplied.discountValue}% off` 
              : `${(promoApplied.discountValue / 100).toFixed(2)} HTG off`}
          </p>
        )}
        {promoError && (
          <p className="text-sm text-red-600 mt-1">{promoError}</p>
        )}
      </div>

      {/* Price Summary */}
      {selectedTierData && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tier: {selectedTierData.name}</span>
              <span className="text-gray-900">{selectedTierData.price.toFixed(2)} HTG</span>
            </div>
            {promoApplied && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Promo Discount</span>
                <span>-{(selectedTierData.price - finalPrice).toFixed(2)} HTG</span>
              </div>
            )}
            {getApplicableGroupDiscount() && !promoApplied && (
              <div className="flex justify-between text-sm text-orange-600">
                <span>Group Discount ({getApplicableGroupDiscount()?.discount_percentage}% off {getApplicableGroupDiscount()?.min_quantity}+ tickets)</span>
                <span>-{(selectedTierData.price - finalPrice).toFixed(2)} HTG</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Quantity</span>
              <span className="text-gray-900">× {quantity}</span>
            </div>
            <div className="border-t border-gray-300 pt-2 flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span className="text-teal-600">{totalPrice.toFixed(2)} HTG</span>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Button */}
      <button
        onClick={handlePurchase}
        disabled={!selectedTier || !userId}
        className="w-full bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {!userId ? 'Sign in to purchase' : `Purchase ${quantity} Ticket${quantity !== 1 ? 's' : ''}`}
      </button>
    </div>
  )
}
