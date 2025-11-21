import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { sendEmail, getTicketConfirmationEmail } from '@/lib/email'
import { generateTicketQRCode } from '@/lib/qrcode'
import { sendWhatsAppMessage, getTicketConfirmationWhatsApp } from '@/lib/whatsapp'
import { trackPromoCodeUsage, calculateDiscount } from '@/lib/promo-codes'

// Lazy load Stripe to avoid build-time initialization
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY)
}

export async function POST(request: Request) {
  try {
    const stripe = getStripe()
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object

      // Create tickets in database
      const supabase = await createClient()
      const quantity = parseInt(session.metadata.quantity || '1', 10)
      const pricePerTicket = session.amount_total / 100 / quantity // Total price divided by quantity
      
      // Create multiple tickets
      const ticketsToCreate = []
      for (let i = 0; i < quantity; i++) {
        const qrCodeData = `ticket-${session.metadata.eventId}-${session.client_reference_id}-${Date.now()}-${i}`
        ticketsToCreate.push({
          event_id: session.metadata.eventId,
          attendee_id: session.client_reference_id,
          price_paid: pricePerTicket,
          payment_method: 'stripe',
          payment_id: session.payment_intent,
          status: 'valid',
          qr_code_data: qrCodeData,
          purchased_at: new Date().toISOString(),
        })
      }

      const { data: tickets, error: ticketError } = await supabase
        .from('tickets')
        .insert(ticketsToCreate)
        .select(`
          *,
          event:events (*),
          attendee:users (*)
        `)

      if (ticketError) {
        console.error('Failed to create tickets:', ticketError)
        return NextResponse.json({ error: 'Failed to create tickets' }, { status: 500 })
      }

      const ticket = tickets?.[0] // Use first ticket for email

      // Track promo code usage if applicable
      if (session.metadata.promoCodeId && session.metadata.originalPrice) {
        const { data: promoCode } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('id', session.metadata.promoCodeId)
          .single()

        if (promoCode) {
          const originalPrice = parseFloat(session.metadata.originalPrice)
          const { discountAmount } = calculateDiscount(originalPrice, promoCode)
          
          await trackPromoCodeUsage(
            session.metadata.promoCodeId,
            session.client_reference_id,
            ticket.id,
            discountAmount,
            supabase
          )
        }
      }

      // Update tickets_sold count
      const { data: eventData } = await supabase
        .from('events')
        .select('tickets_sold')
        .eq('id', session.metadata.eventId)
        .single()

      if (eventData) {
        await supabase
          .from('events')
          .update({ tickets_sold: (eventData.tickets_sold || 0) + quantity })
          .eq('id', session.metadata.eventId)
      }

      // Generate QR code
      const qrCodeDataURL = await generateTicketQRCode(ticket.id)

      // Send confirmation email
      if (ticket.attendee && ticket.event) {
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
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 400 }
    )
  }
}
