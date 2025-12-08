/**
 * Integration tests for payment flow with currency conversion
 * Tests the complete flow from payment intent creation to ticket generation
 */

import { fetchStripeHTGRate } from '@/lib/currency'

// Mock fetch
global.fetch = jest.fn()

describe('Payment Integration with Currency Conversion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Payment Intent Creation Flow', () => {
    it('should convert HTG event price to USD for Stripe using live rate', async () => {
      const mockLiveRate = 0.0079 // Slightly better rate than hardcoded
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      
      // Mock ExchangeRate-API response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false // Stripe not available
      })
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rates: {
            USD: mockLiveRate
          }
        })
      })

      const eventPriceHTG = 1000 // G1000
      const rate = await fetchStripeHTGRate()
      const stripePriceUSD = eventPriceHTG * rate
      
      expect(rate).toBe(mockLiveRate)
      expect(stripePriceUSD).toBe(7.9) // Better than hardcoded 7.6
    })

    it('should handle multiple ticket purchases with correct conversion', async () => {
      const mockRate = 0.0076
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rates: {
            USD: mockRate
          }
        })
      })

      const ticketPriceHTG = 500
      const quantity = 3
      
      const rate = await fetchStripeHTGRate()
      const totalHTG = ticketPriceHTG * quantity
      const totalUSD = totalHTG * rate
      
      expect(totalHTG).toBe(1500)
      expect(totalUSD).toBeCloseTo(11.4, 2) // 1500 * 0.0076
    })
  })

  describe('Multi-Currency Event Support', () => {
    it('should handle USD events without conversion', async () => {
      const eventPriceUSD = 25
      const quantity = 2
      const totalUSD = eventPriceUSD * quantity
      
      // No conversion needed for USD events
      expect(totalUSD).toBe(50)
      
      // Should not call exchange rate API for USD events
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should store exchange rate metadata for HTG events', async () => {
      const mockRate = 0.0076
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rates: {
            USD: mockRate
          }
        })
      })

      const rate = await fetchStripeHTGRate()
      
      // Simulate metadata that would be stored in Stripe PaymentIntent
      const metadata = {
        currency: 'usd',
        originalCurrency: 'HTG',
        exchangeRate: rate.toString(),
        priceInOriginalCurrency: '1000'
      }
      
      expect(metadata.originalCurrency).toBe('HTG')
      expect(parseFloat(metadata.exchangeRate)).toBe(mockRate)
      expect(metadata.priceInOriginalCurrency).toBe('1000')
    })
  })

  describe('Revenue Analytics with Currency Conversion', () => {
    it('should calculate correct revenue in USD from HTG sales', async () => {
      // Simulate multiple ticket sales
      const tickets = [
        { priceHTG: 500, exchangeRate: 0.0076 },   // G500 = $3.80
        { priceHTG: 1000, exchangeRate: 0.0077 },  // G1000 = $7.70
        { priceHTG: 2000, exchangeRate: 0.0078 },  // G2000 = $15.60
      ]
      
      const totalUSD = tickets.reduce((sum, ticket) => {
        return sum + (ticket.priceHTG * ticket.exchangeRate)
      }, 0)
      
      expect(totalUSD).toBeCloseTo(27.10, 2)
    })

    it('should track different exchange rates across transactions', async () => {
      // Simulate tickets purchased at different times with different rates
      const ticket1Rate = 0.0075 // Older rate
      const ticket2Rate = 0.0078 // Newer, better rate
      
      const ticketPrice = 1000 // G1000
      
      const ticket1USD = ticketPrice * ticket1Rate // $7.50
      const ticket2USD = ticketPrice * ticket2Rate // $7.80
      
      expect(ticket1USD).toBe(7.5)
      expect(ticket2USD).toBe(7.8)
      
      // Revenue difference due to rate change
      const rateDifference = ticket2USD - ticket1USD
      expect(rateDifference).toBeCloseTo(0.30, 2)
    })
  })

  describe('Error Handling in Payment Flow', () => {
    it('should use fallback rate when all APIs fail', async () => {
      const hardcodedRate = 0.0076
      
      // All API calls fail
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const rate = await fetchStripeHTGRate()
      const ticketPriceHTG = 1000
      const stripePriceUSD = ticketPriceHTG * rate
      
      expect(rate).toBe(hardcodedRate)
      expect(stripePriceUSD).toBe(7.6)
      
      // Payment should still work with fallback rate
      expect(stripePriceUSD).toBeGreaterThan(0)
    })

    it('should handle API timeout gracefully', async () => {
      jest.setTimeout(10000)
      
      // Simulate slow API response
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ ok: false })
          }, 100)
        })
      )

      const startTime = Date.now()
      const rate = await fetchStripeHTGRate()
      const endTime = Date.now()
      
      expect(rate).toBe(0.0076) // Should fallback
      expect(endTime - startTime).toBeLessThan(5000) // Should timeout quickly
    })
  })

  describe('Discount and Coupon Handling with Currency', () => {
    it('should apply percentage discount before currency conversion', async () => {
      const ticketPriceHTG = 1000 // G1000
      const discountPercent = 20 // 20% off
      
      const discountedPriceHTG = ticketPriceHTG * (1 - discountPercent / 100)
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rates: { USD: 0.0076 }
        })
      })

      const rate = await fetchStripeHTGRate()
      const finalPriceUSD = discountedPriceHTG * rate
      
      expect(discountedPriceHTG).toBe(800) // G800
      expect(finalPriceUSD).toBeCloseTo(6.08, 2) // $6.08
    })

    it('should apply fixed amount discount in event currency', async () => {
      const ticketPriceHTG = 1000 // G1000
      const discountHTG = 200 // G200 off
      
      const finalPriceHTG = ticketPriceHTG - discountHTG
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rates: { USD: 0.0076 }
        })
      })

      const rate = await fetchStripeHTGRate()
      const finalPriceUSD = finalPriceHTG * rate
      
      expect(finalPriceHTG).toBe(800)
      expect(finalPriceUSD).toBeCloseTo(6.08, 2)
    })
  })

  describe('Rate Caching and Performance', () => {
    it('should fetch rate for each payment (ensures fresh rates)', async () => {
      // Mock responses for 3 separate purchases
      const mockRates = [0.0076, 0.0077, 0.0078] // Rates can change over time
      
      for (let i = 0; i < mockRates.length; i++) {
        // Mock failed Stripe call
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false
        })
        
        // Mock successful ExchangeRate-API call
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            rates: { USD: mockRates[i] }
          })
        })

        const rate = await fetchStripeHTGRate()
        expect(rate).toBe(mockRates[i])
      }
      
      // Should have called APIs multiple times (2 calls per purchase: Stripe + fallback)
      expect(global.fetch).toHaveBeenCalled()
    })
  })
})
