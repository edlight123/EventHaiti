/**
 * Diagnostic script to check event data
 * Run with: node scripts/check-events.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkEvents() {
  console.log('🔍 Checking events in database...\n');
  
  try {
    // Get all events
    const eventsSnapshot = await db.collection('events').limit(10).get();
    
    console.log(`📊 Total events found: ${eventsSnapshot.size}\n`);
    
    if (eventsSnapshot.empty) {
      console.log('❌ No events in database!');
      console.log('💡 Create some events first using /admin/create-test-data');
      return;
    }
    
    console.log('📝 Sample events:');
    console.log('─'.repeat(80));
    
    eventsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n${index + 1}. Event ID: ${doc.id}`);
      console.log(`   Title: ${data.title || 'N/A'}`);
      console.log(`   is_published: ${data.is_published}`);
      console.log(`   status: ${data.status || 'N/A'}`);
      console.log(`   start_datetime: ${data.start_datetime?.toDate?.() || data.start_datetime}`);
      console.log(`   city: ${data.city || 'N/A'}`);
      console.log(`   category: ${data.category || 'N/A'}`);
    });
    
    console.log('\n' + '─'.repeat(80));
    
    // Check published events
    const publishedSnapshot = await db.collection('events')
      .where('is_published', '==', true)
      .limit(5)
      .get();
      
    console.log(`\n✅ Published events: ${publishedSnapshot.size}`);
    
    // Check future events
    const now = admin.firestore.Timestamp.now();
    const futureSnapshot = await db.collection('events')
      .where('is_published', '==', true)
      .where('start_datetime', '>=', now)
      .limit(5)
      .get();
      
    console.log(`📅 Future published events: ${futureSnapshot.size}`);
    
    if (futureSnapshot.size === 0) {
      console.log('\n⚠️  No future published events found!');
      console.log('💡 Events may be in the past or not published yet.');
    }
    
  } catch (error) {
    console.error('❌ Error checking events:', error);
    console.log('\n💡 This might be due to:');
    console.log('   1. Missing FIREBASE_SERVICE_ACCOUNT_KEY env variable');
    console.log('   2. Index still building (wait 5-30 mins)');
    console.log('   3. Firestore rules blocking access');
  }
}

checkEvents().then(() => {
  console.log('\n✅ Diagnostic complete\n');
  process.exit(0);
}).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
