import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getTransactionDetails } from '@/lib/moncash'
import { sendEmail, getTicketConfirmationEmail } from '@/lib/email'
import { sendWhatsAppMessage, getTicketConfirmationWhatsApp } from '@/lib/whatsapp'
import { generateTicketQRCode } from '@/lib/qrcode'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transactionId')

    if (!transactionId) {
      return NextResponse.redirect(
        new URL('/purchase/failed?reason=missing_transaction', request.url)
      )
    }

    const supabase = await createClient()

    // Get pending transaction
    const { data: pendingTx, error: txError } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('transaction_id', transactionId)
      .single()

    if (txError || !pendingTx) {
      return NextResponse.redirect(
        new URL('/purchase/failed?reason=transaction_not_found', request.url)
      )
    }

    // Verify payment with MonCash
    const transactionDetails = await getTransactionDetails(transactionId)

    if (transactionDetails.message !== 'successful') {
      // Update transaction status
      await supabase
        .from('pending_transactions')
        .update({ status: 'failed' })
        .eq('transaction_id', transactionId)

      return NextResponse.redirect(
        new URL('/purchase/failed?reason=payment_failed', request.url)
      )
    }

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        event_id: pendingTx.event_id,
        attendee_id: pendingTx.user_id,
        price_paid: pendingTx.amount,
        payment_method: 'moncash',
        payment_id: transactionId,
        status: 'valid',
      })
      .select(`
        *,
        event:events (*),
        attendee:users (*)
      `)
      .single()

    if (ticketError) {
      console.error('Failed to create ticket:', ticketError)
      return NextResponse.redirect(
        new URL('/purchase/failed?reason=ticket_creation_failed', request.url)
      )
    }

    // Update transaction status
    await supabase
      .from('pending_transactions')
      .update({ 
        status: 'completed',
        ticket_id: ticket.id,
      })
      .eq('transaction_id', transactionId)

    // Generate QR code
    const qrCodeDataURL = await generateTicketQRCode(ticket.id)

    // Send confirmation email
    if (ticket.attendee && ticket.event) {
      await sendEmail({
        to: ticket.attendee.email,
        subject: `Your ticket for ${ticket.event.title}`,
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

      // Send WhatsApp notification if phone number available
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

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/purchase/success?ticketId=${ticket.id}`, request.url)
    )
  } catch (error: any) {
    console.error('MonCash callback error:', error)
    return NextResponse.redirect(
      new URL('/purchase/failed?reason=processing_error', request.url)
    )
  }
}
