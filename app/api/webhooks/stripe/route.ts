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

      // Create ticket in database
      const supabase = await createClient()
      
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          event_id: session.metadata.eventId,
          attendee_id: session.client_reference_id,
          price_paid: session.amount_total / 100, // Convert from cents
          payment_method: 'stripe',
          payment_id: session.payment_intent,
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
        return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
      }

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
