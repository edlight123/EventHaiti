export type PromoCodeApiResponse = any

export type PromoCodeValidation = {
  valid: boolean
  discount_percentage?: number
  discount_amount?: number
  error?: string
}

/**
 * Normalizes promo validation responses across multiple server shapes.
 *
 * Supports:
 * - { valid, discount_percentage, discount_amount }
 * - { valid, promoCode: { discountType, discountValue } }
 * - { valid, promoCode: { discount_type, discount_value } }
 */
export function normalizePromoValidationResponse(data: PromoCodeApiResponse): PromoCodeValidation {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid response' }
  }

  if (!data.valid) {
    return { valid: false, error: data.error || data.message || 'Invalid promo code' }
  }

  // Preferred legacy fields (already what the mobile selector expects)
  if (typeof data.discount_percentage === 'number' || typeof data.discount_amount === 'number') {
    return {
      valid: true,
      discount_percentage: typeof data.discount_percentage === 'number' ? data.discount_percentage : undefined,
      discount_amount: typeof data.discount_amount === 'number' ? data.discount_amount : undefined,
    }
  }

  const promo = data.promoCode || data.promocode || null
  const rawType = String(promo?.discountType ?? promo?.discount_type ?? '').toLowerCase()
  const rawValue = Number(promo?.discountValue ?? promo?.discount_value)
  const discountValue = Number.isFinite(rawValue) ? rawValue : 0

  if (rawType === 'percentage') {
    return { valid: true, discount_percentage: discountValue }
  }

  // Treat anything else as fixed amount
  return { valid: true, discount_amount: discountValue }
}
