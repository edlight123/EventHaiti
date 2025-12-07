// Debug script to check attendee data structure
import { adminDb } from './lib/firebase/admin.js';

async function debugAttendees() {
  try {
    console.log('Searching for user: info@edlight.org\n');
    
    const usersSnapshot = await adminDb
      .collection('users')
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
    
    // Get user's events
    const eventsSnapshot = await adminDb
      .collection('events')
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
    console.log('');
    
    // Check event data types
    console.log('EVENT FIELD TYPES:');
    for (const [key, value] of Object.entries(eventData)) {
      const type = value?.constructor?.name || typeof value;
      console.log(`  ${key}: ${type}`);
      if (type === 'Timestamp') {
        console.log(`    ⚠️  TIMESTAMP FOUND - Value: ${value.toDate().toISOString()}`);
      }
    }
    console.log('');
    
    // Get tickets for this event
    const ticketsSnapshot = await adminDb
      .collection('tickets')
      .where('event_id', '==', eventDoc.id)
      .limit(2)
      .get();
    
    console.log(`Found ${ticketsSnapshot.docs.length} tickets\n`);
    
    if (ticketsSnapshot.docs.length > 0) {
      const firstTicket = ticketsSnapshot.docs[0];
      const ticketData = firstTicket.data();
      
      console.log('TICKET FIELD TYPES:');
      for (const [key, value] of Object.entries(ticketData)) {
        const type = value?.constructor?.name || typeof value;
        console.log(`  ${key}: ${type}`);
        if (type === 'Timestamp') {
          console.log(`    ⚠️  TIMESTAMP FOUND - Value: ${value.toDate().toISOString()}`);
        }
      }
      console.log('');
      
      // Get attendee data
      if (ticketData.attendee_id) {
        const attendeeDoc = await adminDb.collection('users').doc(ticketData.attendee_id).get();
        if (attendeeDoc.exists) {
          const attendeeData = attendeeDoc.data();
          
          console.log('ATTENDEE FIELD TYPES:');
          console.log('Email:', attendeeData.email);
          console.log('Full Name:', attendeeData.full_name);
          console.log('');
          for (const [key, value] of Object.entries(attendeeData)) {
            const type = value?.constructor?.name || typeof value;
            console.log(`  ${key}: ${type}`);
            if (type === 'Timestamp') {
              console.log(`    ⚠️  TIMESTAMP FOUND - Value: ${value.toDate().toISOString()}`);
            }
          }
        }
      }
    }
    
    console.log('\n✅ Debug complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

debugAttendees();
