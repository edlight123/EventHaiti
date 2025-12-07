import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugAttendees() {
  try {
    console.log('Searching for user: info@edlight.org\n');
    
    const usersSnapshot = await db.collection('users')
      .where('email', '==', 'info@edlight.org')
      .get();
    
    if (usersSnapshot.empty) {
      console.log('No user found');
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    
    console.log('USER:', userId);
    console.log('Email:', userData.email);
    console.log('Role:', userData.role);
    console.log('');
    
    const eventsSnapshot = await db.collection('events')
      .where('organizer_id', '==', userId)
      .limit(1)
      .get();
    
    if (eventsSnapshot.empty) {
      console.log('No events found');
      return;
    }
    
    const eventDoc = eventsSnapshot.docs[0];
    const eventData = eventDoc.data();
    
    console.log('EVENT:', eventDoc.id);
    console.log('Title:', eventData.title);
    console.log('start_datetime type:', eventData.start_datetime?.constructor?.name || typeof eventData.start_datetime);
    console.log('start_datetime value:', eventData.start_datetime);
    console.log('');
    
    const ticketsSnapshot = await db.collection('tickets')
      .where('event_id', '==', eventDoc.id)
      .limit(2)
      .get();
    
    console.log('Tickets found:', ticketsSnapshot.docs.length);
    console.log('');
    
    if (ticketsSnapshot.docs.length > 0) {
      const firstTicket = ticketsSnapshot.docs[0];
      const ticketData = firstTicket.data();
      
      console.log('TICKET DATA:');
      console.log('ID:', firstTicket.id);
      console.log('All fields:', Object.keys(ticketData));
      console.log('');
      console.log('Field Types:');
      for (const [key, value] of Object.entries(ticketData)) {
        const type = value?.constructor?.name || typeof value;
        console.log(`  ${key}: ${type}`);
        if (type === 'Timestamp') {
          console.log(`    Value: ${value.toDate().toISOString()}`);
        }
      }
      console.log('');
      
      if (ticketData.attendee_id) {
        const attendeeDoc = await db.collection('users').doc(ticketData.attendee_id).get();
        if (attendeeDoc.exists) {
          const attendeeData = attendeeDoc.data();
          
          console.log('ATTENDEE DATA:');
          console.log('ID:', attendeeDoc.id);
          console.log('Email:', attendeeData.email);
          console.log('Full Name:', attendeeData.full_name);
          console.log('');
          console.log('Field Types:');
          for (const [key, value] of Object.entries(attendeeData)) {
            const type = value?.constructor?.name || typeof value;
            console.log(`  ${key}: ${type}`);
            if (type === 'Timestamp') {
              console.log(`    Value: ${value.toDate().toISOString()}`);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

debugAttendees();
