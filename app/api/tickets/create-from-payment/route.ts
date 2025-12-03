import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { sendEmail, getTicketConfirmationEmail } from '@/lib/email'
import { generateTicketQRCode } from '@/lib/qrcode'
import { notifyTicketPurchase, notifyOrganizerTicketSale } from '@/lib/notifications/helpers'

// Lazy load Stripe
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY)
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentIntentId } = await request.json()

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment Intent ID is required' }, { status: 400 })
    }

    const stripe = getStripe()
    const supabase = await createClient()

    // Verify payment intent exists and succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    // Check if tickets already exist for this payment
    const { data: existingTickets } = await supabase
      .from('tickets')
      .select('id')
      .eq('payment_id', paymentIntentId)

    if (existingTickets && existingTickets.length > 0) {
      console.log('✅ Tickets already exist for payment:', paymentIntentId)
      return NextResponse.json({ 
        success: true, 
        ticketIds: existingTickets.map((t: any) => t.id),
        message: 'Tickets already created' 
      })
    }

    // Create tickets
    const quantity = parseInt(paymentIntent.metadata.quantity || '1', 10)
    const pricePerTicket = paymentIntent.amount / 100 / quantity

    const createdTickets = []
    for (let i = 0; i < quantity; i++) {
      const qrCodeData = `ticket-${paymentIntent.metadata.eventId}-${paymentIntent.metadata.userId}-${Date.now()}-${i}`
      const ticketData = {
        event_id: paymentIntent.metadata.eventId,
        attendee_id: paymentIntent.metadata.userId,
        price_paid: pricePerTicket,
        payment_method: 'stripe',
        payment_id: paymentIntentId,
        status: 'valid',
        qr_code_data: qrCodeData,
        purchased_at: new Date().toISOString(),
        tier_id: paymentIntent.metadata.tierId || null,
        tier_name: paymentIntent.metadata.tierName || 'General Admission',
      }
      
      const insertResult = await supabase
        .from('tickets')
        .insert([ticketData])
        .select()
      
      if (insertResult.error) {
        console.error('Failed to create ticket:', insertResult.error)
        continue
      }
      
      const createdTicket = insertResult.data?.[0]
      if (createdTicket) {
        createdTickets.push(createdTicket)
        console.log('✅ Created ticket:', createdTicket.id)
      }
    }

    if (createdTickets.length === 0) {
      return NextResponse.json({ error: 'Failed to create tickets' }, { status: 500 })
    }

    // Update tickets_sold count
    const { data: eventData } = await supabase
      .from('events')
      .select('tickets_sold')
      .eq('id', paymentIntent.metadata.eventId)
      .single()

    if (eventData) {
      await supabase
        .from('events')
        .update({ tickets_sold: (eventData.tickets_sold || 0) + quantity })
        .eq('id', paymentIntent.metadata.eventId)
    }

    // Send notification
    const eventQuery = await supabase.from('events').select('*')
    const eventDetails = eventQuery.data?.find((e: any) => e.id === paymentIntent.metadata.eventId)
    
    if (eventDetails) {
      try {
        await notifyTicketPurchase(
          paymentIntent.metadata.userId,
          paymentIntent.metadata.eventId,
          eventDetails.title,
          quantity
        )
        
        // Notify organizer about the sale
        const attendeeQuery = await supabase.from('users').select('*')
        const attendee = attendeeQuery.data?.find((u: any) => u.id === paymentIntent.metadata.userId)
        
        await notifyOrganizerTicketSale(
          eventDetails.organizer_id,
          paymentIntent.metadata.eventId,
          eventDetails.title,
          quantity,
          paymentIntent.amount / 100,
          attendee?.full_name
        )
      } catch (error) {
        console.error('Failed to send notification:', error)
      }

      // Send email confirmation
      const attendeeQuery = await supabase.from('users').select('*')
      const attendee = attendeeQuery.data?.find((u: any) => u.id === paymentIntent.metadata.userId)

      if (attendee) {
        const firstTicket = createdTickets[0]
        const qrCodeDataURL = await generateTicketQRCode(firstTicket.id)

        await sendEmail({
          to: attendee.email,
          subject: `Your ${quantity > 1 ? `${quantity} tickets` : 'ticket'} for ${eventDetails.title}`,
          html: getTicketConfirmationEmail({
            attendeeName: attendee.full_name || 'Guest',
            eventTitle: eventDetails.title,
            eventDate: new Date(eventDetails.start_datetime).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }),
            eventVenue: `${eventDetails.venue_name}, ${eventDetails.city}`,
            ticketId: firstTicket.id,
            qrCodeDataURL,
          }),
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      ticketIds: createdTickets.map((t: any) => t.id),
      message: `${createdTickets.length} ticket(s) created successfully` 
    })
  } catch (error: any) {
    console.error('Ticket creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create tickets' },
      { status: 500 }
    )
  }
}
