import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/firebase-db/server'
import { getMonCashButtonPaymentByOrderId, getMonCashButtonPaymentByTransactionId } from '@/lib/moncash-button'
import { sendEmail, getTicketConfirmationEmail } from '@/lib/email'
import { sendWhatsAppMessage, getTicketConfirmationWhatsApp } from '@/lib/whatsapp'
import { generateTicketQRCode } from '@/lib/qrcode'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Digicel parameter names can vary depending on configuration.
    const transactionId =
      searchParams.get('transactionId') ||
      searchParams.get('transaction_id') ||
      searchParams.get('transNumber') ||
      searchParams.get('trans_number') ||
      searchParams.get('trans') ||
      null

    // Prefer explicit orderId if provided.
    const orderIdFromQuery =
      searchParams.get('orderId') ||
      searchParams.get('order_id') ||
      searchParams.get('reference') ||
      searchParams.get('ref') ||
      null

    let orderId: string | null = orderIdFromQuery

    const supabase = await createClient()

    // Attempt to map a token-like transactionId to our stored checkout token.
    // Some portal setups redirect with a token in transactionId (looks like base64/base64url).
    if (!orderId && transactionId) {
      const { data: tokenTx } = await supabase
        .from('pending_transactions')
        .select('order_id')
        .eq('moncash_button_token', transactionId)
        .single()

      if (tokenTx?.order_id) {
        orderId = String(tokenTx.order_id)
      }
    }

    // Cookie correlation fallback (set during /api/moncash-button/initiate).
    if (!orderId) {
      const orderIdFromCookie = cookies().get('moncash_button_order_id')?.value
      if (orderIdFromCookie) orderId = orderIdFromCookie
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
        hasTransactionId: Boolean(transactionId),
        queryKeys: Array.from(searchParams.keys()),
        hasCookieOrder: Boolean(cookies().get('moncash_button_order_id')?.value),
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
