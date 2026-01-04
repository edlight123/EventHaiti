import { normalizePromoValidationResponse } from '../mobile/lib/promoCodes'

describe('mobile promo code response normalization', () => {
  it('passes through legacy discount_percentage', () => {
    expect(normalizePromoValidationResponse({ valid: true, discount_percentage: 20 })).toEqual({
      valid: true,
      discount_percentage: 20,
      discount_amount: undefined,
    })
  })

  it('maps promoCode.discountType/discountValue to discount_percentage', () => {
    expect(
      normalizePromoValidationResponse({
        valid: true,
        promoCode: { discountType: 'percentage', discountValue: 10 },
      })
    ).toEqual({ valid: true, discount_percentage: 10 })
  })

  it('maps promoCode.discount_type/discount_value to discount_amount', () => {
    expect(
      normalizePromoValidationResponse({
        valid: true,
        promoCode: { discount_type: 'fixed', discount_value: 50 },
      })
    ).toEqual({ valid: true, discount_amount: 50 })
  })

  it('handles invalid responses', () => {
    expect(normalizePromoValidationResponse(null as any)).toEqual({ valid: false, error: 'Invalid response' })
    expect(normalizePromoValidationResponse({ valid: false, error: 'Nope' })).toEqual({ valid: false, error: 'Nope' })
  })
})
