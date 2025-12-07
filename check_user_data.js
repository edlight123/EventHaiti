const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkUserData() {
  try {
    console.log('Searching for user: info@edlight.org\n');
    
    // Find user by email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', 'info@edlight.org')
      .get();
    
    if (usersSnapshot.empty) {
      console.log('No user found with email info@edlight.org');
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    
    console.log('USER DATA:');
    console.log('ID:', userId);
    console.log('Email:', userData.email);
    console.log('Full Name:', userData.full_name);
    console.log('Role:', userData.role);
    console.log('Created At:', userData.created_at);
    console.log('Updated At:', userData.updated_at);
    console.log('\n');
    
    // Get events organized by this user
    console.log('EVENTS ORGANIZED:');
    const eventsSnapshot = await db.collection('events')
      .where('organizer_id', '==', userId)
      .get();
    
    console.log(`Found ${eventsSnapshot.docs.length} events\n`);
    
    for (const eventDoc of eventsSnapshot.docs) {
      const eventData = eventDoc.data();
      console.log('Event:', eventDoc.id);
      console.log('  Title:', eventData.title);
      console.log('  Start:', eventData.start_datetime);
      console.log('  Type of start_datetime:', typeof eventData.start_datetime);
      console.log('  Is Timestamp?:', eventData.start_datetime?.toDate ? 'YES' : 'NO');
      
      // Get tickets for this event
      const ticketsSnapshot = await db.collection('tickets')
        .where('event_id', '==', eventDoc.id)
        .limit(5)
        .get();
      
      console.log(`  Tickets: ${ticketsSnapshot.docs.length}`);
      
      if (ticketsSnapshot.docs.length > 0) {
        const firstTicket = ticketsSnapshot.docs[0];
        const ticketData = firstTicket.data();
        console.log('  Sample Ticket Data:');
        console.log('    Ticket ID:', firstTicket.id);
        console.log('    Attendee ID:', ticketData.attendee_id);
        console.log('    Purchased At:', ticketData.purchased_at);
        console.log('    Type:', typeof ticketData.purchased_at);
        console.log('    Is Timestamp?:', ticketData.purchased_at?.toDate ? 'YES' : 'NO');
        console.log('    Checked In:', ticketData.checked_in);
        console.log('    Checked In At:', ticketData.checked_in_at);
        
        // Get attendee info
        if (ticketData.attendee_id) {
          const attendeeDoc = await db.collection('users').doc(ticketData.attendee_id).get();
          if (attendeeDoc.exists) {
            const attendeeData = attendeeDoc.data();
            console.log('  Sample Attendee Data:');
            console.log('    Email:', attendeeData.email);
            console.log('    Full Name:', attendeeData.full_name);
            console.log('    Created At:', attendeeData.created_at);
            console.log('    Type:', typeof attendeeData.created_at);
            console.log('    Is Timestamp?:', attendeeData.created_at?.toDate ? 'YES' : 'NO');
          }
        }
      }
      
      console.log('\n');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkUserData();
