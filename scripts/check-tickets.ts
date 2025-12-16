// Script to check if tickets exist in Firestore
import { adminDb } from '../lib/firebase-admin'

async function checkTickets() {
  console.log('Checking tickets in Firestore...\n')

  try {
    const ticketsSnapshot = await adminDb
      .collection('tickets')
      .orderBy('purchased_at', 'desc')
      .limit(10)
      .get()

    console.log(`Found ${ticketsSnapshot.size} recent tickets:\n`)

    ticketsSnapshot.forEach((doc) => {
      const data = doc.data()
      console.log('---')
      console.log('Document ID:', doc.id)
      console.log('Event ID:', data.event_id)
      console.log('Attendee Name:', data.attendee_name)
      console.log('Status:', data.status)
      console.log('Has QR Code:', !!data.qr_code_data)
      console.log('Purchased At:', data.purchased_at)
      console.log('Payment Method:', data.payment_method)
      console.log('Has start_datetime:', !!data.start_datetime)
      console.log('Has venue_name:', !!data.venue_name)
      console.log('')
    })

    if (ticketsSnapshot.empty) {
      console.log('❌ No tickets found in database!')
    }
  } catch (error) {
    console.error('Error checking tickets:', error)
  }
}

checkTickets()
