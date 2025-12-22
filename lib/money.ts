export function normalizeCurrency(code: string | null | undefined, fallback = 'HTG'): string {
  const normalized = String(code || '').trim().toUpperCase()
  return normalized ? normalized : fallback
}

export function formatMoneyFromCents(
  cents: number,
  currency: string = 'HTG',
  locale: string = 'en-US'
): string {
  const code = normalizeCurrency(currency)
  const amount = (Number.isFinite(cents) ? cents : 0) / 100

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${code} ${amount.toFixed(2)}`
  }
}

export function formatMultiCurrencyFromCents(
  centsByCurrency: Record<string, number>,
  locale: string = 'en-US'
): string {
  const entries = Object.entries(centsByCurrency)
    .map(([currency, cents]) => [normalizeCurrency(currency), cents] as const)
    .filter(([, cents]) => Number.isFinite(cents) && cents !== 0)
    .sort(([a], [b]) => a.localeCompare(b))

  if (entries.length === 0) return 'No earnings yet'
  if (entries.length === 1) return formatMoneyFromCents(entries[0][1], entries[0][0], locale)

  return entries.map(([currency, cents]) => `${currency} ${((cents as number) / 100).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(' + ')
}
