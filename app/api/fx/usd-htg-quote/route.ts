import { NextResponse } from 'next/server'
import { convertUsdToHtgAmount, getUsdToHtgRateWithSpread } from '@/lib/fx/usd-htg'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const amountRaw = searchParams.get('amount')

    if (!amountRaw) {
      return NextResponse.json({ error: 'Missing amount' }, { status: 400 })
    }

    const amountUsd = Number(amountRaw)
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Business rule: apply a fixed 5% spread.
    const quote = await getUsdToHtgRateWithSpread({ spreadPercent: 0.05 })
    const amountHtg = convertUsdToHtgAmount(amountUsd, quote.effectiveRate)

    return NextResponse.json({
      ...quote,
      amountUsd,
      amountHtg,
      chargeCurrency: 'HTG',
    })
  } catch (error: any) {
    console.error('FX quote error:', error)
    return NextResponse.json({ error: 'Failed to fetch exchange rate' }, { status: 500 })
  }
}
