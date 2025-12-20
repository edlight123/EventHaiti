import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getMonCashButtonPaymentByTransactionId } from '@/lib/moncash-button'

export const runtime = 'nodejs'

function tryExtractReferenceFromJwtLikeToken(token: string): string | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  const payload = parts[1]
  try {
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=')
    const json = Buffer.from(padded, 'base64').toString('utf8')
    const data = JSON.parse(json)
    const ref = data?.ref ?? data?.reference ?? null
    return typeof ref === 'string' && ref.trim() ? ref.trim() : null
  } catch {
    return null
  }
}

function buildTokenVariants(token: string): string[] {
  const raw = String(token || '').trim()
  if (!raw) return []

  const decoded = (() => {
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  })()

  const stripPadding = (v: string) => v.replace(/=+$/g, '')
  const toBase64 = (v: string) => v.replace(/-/g, '+').replace(/_/g, '/')
  const toBase64Url = (v: string) => v.replace(/\+/g, '-').replace(/\//g, '_')

  const candidates = [
    raw,
    decoded,
    stripPadding(raw),
    stripPadding(decoded),
    toBase64(raw),
    toBase64(decoded),
    stripPadding(toBase64(raw)),
    stripPadding(toBase64(decoded)),
    toBase64Url(raw),
    toBase64Url(decoded),
    stripPadding(toBase64Url(raw)),
    stripPadding(toBase64Url(decoded)),
  ]

  return Array.from(new Set(candidates.map((c) => c.trim()).filter(Boolean)))
}

export async function GET(request: Request) {
  // Digicel portal misconfiguration sometimes points the user-facing redirect at the Alert URL.
  // Our Alert handler is meant to be server-to-server POST, so a browser GET would otherwise 405.
  // Redirect GETs to the Return handler which performs verification + ticket creation.
  const currentUrl = new URL(request.url)
  const redirectUrl = new URL('/api/moncash-button/return', request.url)
  currentUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value)
  })
  return NextResponse.redirect(redirectUrl)
}

export async function POST(request: Request) {
  // Digicel "Alert URL" is typically a server-to-server notification.
  // Payload format varies by configuration; accept both form-encoded and JSON.
  try {
    const contentType = request.headers.get('content-type') || ''

    let payload: Record<string, any> = {}

    if (contentType.includes('application/json')) {
      payload = await request.json().catch(() => ({}))
    } else {
      const text = await request.text().catch(() => '')
      if (text) {
        // Try URL-encoded first
        const params = new URLSearchParams(text)
        let anyKey = false
        params.forEach((value, key) => {
          anyKey = true
          payload[key] = value
        })

        if (!anyKey) {
          // Fallback: attempt to parse as JSON
          payload = JSON.parse(text)
        }
      }
    }

    let orderId = payload.orderId || payload.order_id || payload.reference || null
    const transactionId = payload.transactionId || payload.transaction_id || payload.transNumber || null

    if (!orderId && typeof transactionId === 'string' && transactionId.includes('.')) {
      const extracted = tryExtractReferenceFromJwtLikeToken(transactionId)
      if (extracted) {
        orderId = extracted
      }
    }

    // Some Digicel alert payloads omit orderId/reference.
    // First, try correlating the token directly to our pending transaction.
    if (!orderId && transactionId) {
      const supabase = await createClient()
      for (const candidate of buildTokenVariants(String(transactionId))) {
        const { data: tokenTx } = await supabase
          .from('pending_transactions')
          .select('order_id')
          .eq('moncash_button_token', candidate)
          .single()

        if (tokenTx?.order_id) {
          orderId = String(tokenTx.order_id)
          break
        }

        const { data: tokenTx2 } = await supabase
          .from('pending_transactions')
          .select('order_id')
          .contains('moncash_button_token_variants', candidate)
          .single()

        if (tokenTx2?.order_id) {
          orderId = String(tokenTx2.order_id)
          break
        }
      }
    }

    // Next, try middleware lookup.
    if (!orderId && transactionId) {
      try {
        const payment = await getMonCashButtonPaymentByTransactionId(String(transactionId))
        if (payment?.reference) {
          orderId = String(payment.reference)
        }
      } catch (err) {
        console.error('MonCash Button alert: transaction lookup failed', err)
      }
    }

    // Best-effort persistence only; the return URL flow is the source of truth.
    if (orderId || transactionId) {
      const supabase = await createClient()

      if (orderId) {
        await supabase
          .from('pending_transactions')
          .update({
            moncash_alert_received_at: new Date().toISOString(),
            moncash_alert_payload: payload,
            transaction_id: transactionId || null,
          })
          .eq('order_id', orderId)
      } else if (transactionId) {
        await supabase
          .from('pending_transactions')
          .update({
            moncash_alert_received_at: new Date().toISOString(),
            moncash_alert_payload: payload,
          })
          .eq('transaction_id', transactionId)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    // Never fail hard; Digicel may retry.
    console.error('MonCash Button alert error:', error)
    return NextResponse.json({ ok: true })
  }
}
