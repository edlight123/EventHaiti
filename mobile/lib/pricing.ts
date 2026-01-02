export type SupportedCurrency = 'HTG' | 'USD'

function normalizeCurrency(raw: unknown): SupportedCurrency {
  const upper = String(raw || '').toUpperCase()
  return upper === 'USD' ? 'USD' : 'HTG'
}

export function isBudgetFriendlyTicketPrice(price: unknown, currency: unknown): boolean {
  const numeric = Number(price || 0)
  if (!Number.isFinite(numeric)) return false
  if (numeric <= 0) return true

  const curr = normalizeCurrency(currency)
  if (curr === 'USD') return numeric <= 5
  return numeric <= 500
}

export function isOverBudgetTicketPrice(price: unknown, currency: unknown): boolean {
  const numeric = Number(price || 0)
  if (!Number.isFinite(numeric)) return false

  const curr = normalizeCurrency(currency)
  if (curr === 'USD') return numeric > 5
  return numeric > 500
}
