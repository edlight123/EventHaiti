import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'

export const runtime = 'nodejs'

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

    const orderId = payload.orderId || payload.order_id || payload.reference || null
    const transactionId = payload.transactionId || payload.transaction_id || payload.transNumber || null

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
