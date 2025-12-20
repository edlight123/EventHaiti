import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/firebase-db/server'
import {
  decryptMonCashButtonReturnTransactionId,
  getMonCashButtonPaymentByOrderId,
  getMonCashButtonPaymentByTransactionId,
} from '@/lib/moncash-button'
import { sendEmail, getTicketConfirmationEmail } from '@/lib/email'
import { sendWhatsAppMessage, getTicketConfirmationWhatsApp } from '@/lib/whatsapp'
import { generateTicketQRCode } from '@/lib/qrcode'

export const runtime = 'nodejs'

function tryExtractReferenceFromJwtLikeToken(token: string): string | null {
  // Digicel sometimes passes a JWT-like token as `transactionId`.
  // We don't need to verify the signature; we only want the embedded `ref`/reference
  // and we still verify payment via MonCash middleware by orderId afterwards.
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

async function tryResolveOrderIdFromAlerts(supabase: any, transactionId: string): Promise<string | null> {
  const candidates = buildTokenVariants(transactionId)
  for (const candidate of candidates) {
    const { data } = await supabase
      .from('moncash_button_alerts')
      .select('reference')
      .eq('transaction_id', candidate)
      .single()

    if (data?.reference) return String(data.reference)

    const { data: data2 } = await supabase
      .from('moncash_button_alerts')
      .select('reference')
      .contains('transaction_id_variants', candidate)
      .single()

    if (data2?.reference) return String(data2.reference)
  }
  return null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Digicel parameter names can vary depending on configuration.
    const transactionIdEncrypted =
      searchParams.get('transactionId') ||
      searchParams.get('transaction_id') ||
      searchParams.get('transNumber') ||
      searchParams.get('trans_number') ||
      searchParams.get('trans') ||
      null

    // Per Digicel docs, ReturnUrl transactionId is encrypted.
    // Decrypt it (best-effort) to obtain the real transaction id used for Payment/Transaction lookup.
    const transactionIdDecrypted = transactionIdEncrypted
      ? decryptMonCashButtonReturnTransactionId(transactionIdEncrypted)
      : null

    const transactionId = transactionIdDecrypted || transactionIdEncrypted

    if (transactionIdEncrypted) {
      const encLen = String(transactionIdEncrypted).length
      const decLen = transactionIdDecrypted ? String(transactionIdDecrypted).length : null
      console.info('[moncash_button] return: transactionId decrypt', {
        hasEncrypted: true,
        encryptedLen: encLen,
        decrypted: Boolean(transactionIdDecrypted),
        decryptedLen: decLen,
      })
    }

    // Prefer explicit orderId if provided.
    const orderIdFromQuery =
      searchParams.get('orderId') ||
      searchParams.get('order_id') ||
      searchParams.get('reference') ||
      searchParams.get('ref') ||
      null

    let orderId: string | null = orderIdFromQuery

    const supabase = await createClient()

    // If transactionId is a JWT-like token, it may contain the reference/orderId.
    if (!orderId && transactionIdEncrypted && transactionIdEncrypted.includes('.')) {
      const extracted = tryExtractReferenceFromJwtLikeToken(transactionIdEncrypted)
      if (extracted) {
        orderId = extracted
      }
    }

    // Attempt to map a token-like transactionId to our stored checkout token.
    // Some portal setups redirect with a token in transactionId (looks like base64/base64url).
    if (!orderId && transactionIdEncrypted) {
      for (const candidate of buildTokenVariants(transactionIdEncrypted)) {
        const { data: tokenTx } = await supabase
          .from('pending_transactions')
          .select('order_id')
          .eq('moncash_button_token', candidate)
          .single()

        if (tokenTx?.order_id) {
          orderId = String(tokenTx.order_id)
          break
        }

        // Also check optional variants array if present.
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

    // Cookie correlation fallback (set during /api/moncash-button/initiate).
    if (!orderId) {
      const jar = cookies()
      const orderIdFromCookie =
        jar.get('moncash_button_order_id')?.value || jar.get('__Host-moncash_button_order_id')?.value || null
      if (orderIdFromCookie) orderId = orderIdFromCookie
    }

    // Alert-based correlation fallback: the Alert endpoint can arrive before (or instead of) a usable cookie.
    if (!orderId && transactionIdEncrypted) {
      const fromAlerts = await tryResolveOrderIdFromAlerts(supabase, transactionIdEncrypted)
      if (fromAlerts) orderId = fromAlerts
    }

    // Cookie-less correlation: Digicel provides transactionId; the payment reference should match our orderId.
    // NOTE: Our Firebase DB adapter does NOT support `.or()`; using it can accidentally run an unfiltered query.
    // So we try a couple of explicit equality lookups instead.
    let paymentFromLookup: any = null
    if (!orderId && transactionId) {
      const { data: txMatch1 } = await supabase
        .from('pending_transactions')
        .select('order_id')
        .eq('transaction_id', transactionId)
        .single()

      if (txMatch1?.order_id) {
        orderId = String(txMatch1.order_id)
      } else {
        const { data: txMatch2 } = await supabase
          .from('pending_transactions')
          .select('order_id')
          .eq('moncash_trans_number', transactionId)
          .single()

        if (txMatch2?.order_id) {
          orderId = String(txMatch2.order_id)
        }
      }
    }

    if (!orderId && transactionId) {
      try {
        paymentFromLookup = await getMonCashButtonPaymentByTransactionId(transactionId)
        if (paymentFromLookup?.reference) {
          orderId = String(paymentFromLookup.reference)
        }
      } catch (err) {
        console.error('MonCash Button return: transaction lookup failed', err)
      }
    }

    if (!orderId) {
      console.warn('[moncash_button] return: missing_order', {
        hasTransactionId: Boolean(transactionIdEncrypted),
        queryKeys: Array.from(searchParams.keys()),
        hasCookieOrder: Boolean(
          cookies().get('moncash_button_order_id')?.value || cookies().get('__Host-moncash_button_order_id')?.value
        ),
      })
      return NextResponse.redirect(new URL('/purchase/failed?reason=missing_order', request.url))
    }

    const { data: pendingTx, error: txError } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('order_id', orderId)
      .single()

    if (txError || !pendingTx) {
      return NextResponse.redirect(new URL('/purchase/failed?reason=transaction_not_found', request.url))
    }

    // Idempotency: if the transaction is already completed and has a ticket id, don't create duplicates.
    if (pendingTx.status === 'completed' && pendingTx.ticket_id) {
      return NextResponse.redirect(new URL(`/purchase/success?ticketId=${pendingTx.ticket_id}`, request.url))
    }

    // Verify payment via MonCash Button middleware
    const payment = paymentFromLookup || (await getMonCashButtonPaymentByOrderId(orderId))

    const isPaid = !!(payment?.success && payment?.payment_status)

    if (!isPaid) {
      await supabase
        .from('pending_transactions')
        .update({ status: 'failed' })
        .eq('order_id', orderId)

      return NextResponse.redirect(new URL('/purchase/failed?reason=payment_failed', request.url))
    }

    // Fetch event + attendee
    const { data: eventDetails } = await supabase
      .from('events')
      .select('*')
      .eq('id', pendingTx.event_id)
      .single()

    const { data: attendee } = await supabase
      .from('users')
      .select('*')
      .eq('id', pendingTx.user_id)
      .single()

    const tierSelections: Array<{ tierId?: string | null; tierName?: string; quantity: number; unitPrice: number }> =
      Array.isArray(pendingTx.tier_selections) && pendingTx.tier_selections.length > 0
        ? pendingTx.tier_selections
        : [
            {
              tierId: pendingTx.tier_id || null,
              tierName: pendingTx.tier_name || 'General Admission',
              quantity: pendingTx.quantity || 1,
              unitPrice: (pendingTx.amount || 0) / Math.max(1, pendingTx.quantity || 1),
            },
          ]

    // Create tickets
    const createdTickets: any[] = []

    for (const selection of tierSelections) {
      const selectionQty = selection.quantity || 0
      for (let i = 0; i < selectionQty; i++) {
        const ticketData = {
          event_id: pendingTx.event_id,
          attendee_id: pendingTx.user_id,
          attendee_name: attendee?.full_name || attendee?.email || 'Guest',
          price_paid: selection.unitPrice,
          currency: pendingTx.currency || 'HTG',
          original_currency: pendingTx.currency || 'HTG',
          exchange_rate_used: null,
          payment_method: 'moncash',
          payment_id: transactionId || payment.transNumber || orderId,
          status: 'valid',
          purchased_at: new Date().toISOString(),
          tier_name: selection.tierName || 'General Admission',
          tier_id: selection.tierId || null,
          // Include event date fields for scanner
          start_datetime: eventDetails?.start_datetime || null,
          end_datetime: eventDetails?.end_datetime || null,
          event_date: eventDetails?.start_datetime || null,
          venue_name: eventDetails?.venue_name || null,
          city: eventDetails?.city || null,
        }

        const insertResult = await supabase.from('tickets').insert([ticketData]).select()

        if (insertResult.error) {
          console.error('Failed to create ticket:', insertResult.error)
          return NextResponse.redirect(new URL('/purchase/failed?reason=ticket_creation_failed', request.url))
        }

        const createdTicket = insertResult.data?.[0]
        if (createdTicket) {
          await supabase.from('tickets').update({ qr_code_data: createdTicket.id }).eq('id', createdTicket.id)
          createdTicket.qr_code_data = createdTicket.id
          createdTickets.push(createdTicket)
        }
      }
    }

    const ticket = createdTickets[0]
      ? {
          ...createdTickets[0],
          event: eventDetails,
          attendee,
        }
      : null

    // Update transaction status
    await supabase
      .from('pending_transactions')
      .update({
        status: 'completed',
        ticket_id: ticket?.id || null,
        transaction_id: transactionId || payment.transNumber || null,
        moncash_trans_number: payment.transNumber || null,
        moncash_payer: payment.payer || null,
      })
      .eq('order_id', orderId)

    // Update tickets_sold count
    const { data: eventData } = await supabase
      .from('events')
      .select('tickets_sold')
      .eq('id', pendingTx.event_id)
      .single()

    if (eventData) {
      await supabase
        .from('events')
        .update({ tickets_sold: (eventData.tickets_sold || 0) + (pendingTx.quantity || 1) })
        .eq('id', pendingTx.event_id)
    }

    // Generate QR code + notify
    if (ticket?.id) {
      const qrCodeDataURL = await generateTicketQRCode(ticket.id)

      if (ticket.attendee && ticket.event) {
        const quantity = pendingTx.quantity || 1
        const ticketWord = quantity > 1 ? `${quantity} tickets` : 'ticket'

        await sendEmail({
          to: ticket.attendee.email,
          subject: `Your ${ticketWord} for ${ticket.event.title}`,
          html: getTicketConfirmationEmail({
            attendeeName: ticket.attendee.full_name || 'Guest',
            eventTitle: ticket.event.title,
            eventDate: new Date(ticket.event.start_datetime).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }),
            eventVenue: `${ticket.event.venue_name}, ${ticket.event.city}`,
            ticketId: ticket.id,
            qrCodeDataURL,
          }),
        })

        if (ticket.attendee.phone) {
          await sendWhatsAppMessage({
            to: ticket.attendee.phone,
            message: getTicketConfirmationWhatsApp(
              ticket.attendee.full_name || 'Guest',
              ticket.event.title,
              new Date(ticket.event.start_datetime).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }),
              `${ticket.event.venue_name}, ${ticket.event.city}`,
              ticket.id
            ),
          })
        }
      }
    }

    return NextResponse.redirect(new URL(`/purchase/success?ticketId=${ticket?.id || ''}`, request.url))
  } catch (error: any) {
    console.error('MonCash Button return error:', error)
    return NextResponse.redirect(new URL('/purchase/failed?reason=processing_error', request.url))
  }
}
