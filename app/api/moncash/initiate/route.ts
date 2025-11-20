import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { createMonCashPayment } from '@/lib/moncash'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId, quantity = 1 } = await request.json()

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Calculate total amount
    const totalAmount = event.ticket_price * quantity

    // Create order ID
    const orderId = `${eventId}-${user.id}-${Date.now()}`

    // Create MonCash payment
    const { paymentUrl, transactionId } = await createMonCashPayment({
      amount: totalAmount,
      orderId,
      description: `${quantity}x ${event.title}`,
    })

    // Store pending transaction
    await supabase.from('pending_transactions').insert({
      transaction_id: transactionId,
      order_id: orderId,
      user_id: user.id,
      event_id: eventId,
      quantity,
      amount: totalAmount,
      payment_method: 'moncash',
      status: 'pending',
    })

    return NextResponse.json({ 
      paymentUrl,
      transactionId,
      orderId,
    })
  } catch (error: any) {
    console.error('MonCash initiate error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initiate MonCash payment' },
      { status: 500 }
    )
  }
}
