export type Currency = 'USD' | 'HTG'

export interface CurrencyConfig {
  code: string
  symbol: string
  name: string
  decimals: number
}

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2
  },
  HTG: {
    code: 'HTG',
    symbol: 'G',
    name: 'Haitian Gourde',
    decimals: 2
  }
}

// Exchange rates (HTG to USD)
// In production, fetch from an API like exchangerate-api.com
const EXCHANGE_RATES: Record<string, number> = {
  'HTG_TO_USD': 0.0076, // 1 HTG ≈ $0.0076 USD (as of 2025)
  'USD_TO_HTG': 131.58  // 1 USD ≈ 131.58 HTG
}

export function formatCurrency(amount: number, currency: Currency = 'USD'): string {
  const config = CURRENCIES[currency]
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals
  }).format(amount)

  return `${config.symbol}${formatted} ${config.code}`
}

export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): number {
  if (fromCurrency === toCurrency) {
    return amount
  }

  const rateKey = `${fromCurrency}_TO_${toCurrency}`
  const rate = EXCHANGE_RATES[rateKey]

  if (!rate) {
    throw new Error(`Exchange rate not found for ${rateKey}`)
  }

  return amount * rate
}

export function getExchangeRate(from: Currency, to: Currency): number {
  if (from === to) return 1
  
  const rateKey = `${from}_TO_${to}`
  return EXCHANGE_RATES[rateKey] || 1
}

// Get current exchange rates from API (for production)
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  try {
    // In production, use a real API like:
    // const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    // const data = await response.json()
    // return data.rates
    
    return EXCHANGE_RATES
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error)
    return EXCHANGE_RATES // Fallback to hardcoded rates
  }
}

// Parse currency from string (e.g., "$25.00 USD" -> { amount: 25, currency: 'USD' })
export function parseCurrency(str: string): { amount: number; currency: Currency } | null {
  const match = str.match(/([G$])?(\d+(?:\.\d+)?)\s*([A-Z]{3})?/)
  
  if (!match) return null

  const amount = parseFloat(match[2])
  let currency: Currency = 'USD'

  if (match[3] === 'HTG' || match[1] === 'G') {
    currency = 'HTG'
  }

  return { amount, currency }
}
