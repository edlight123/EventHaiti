import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

if (!serviceAccount.project_id) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not set');
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = getFirestore();

async function checkVerifications() {
  console.log('Fetching all verification_requests...\n');
  
  const snapshot = await db.collection('verification_requests').get();
  
  const statusCounts = {};
  const requests = [];
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const status = data.status || 'NO_STATUS';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    
    requests.push({
      id: doc.id,
      status: data.status,
      userId: data.userId || data.user_id,
      reviewedAt: data.reviewedAt || data.reviewed_at,
      reviewNotes: data.reviewNotes || data.rejection_reason,
    });
  });
  
  console.log('=== STATUS COUNTS ===');
  console.log(JSON.stringify(statusCounts, null, 2));
  
  console.log('\n=== ALL REQUESTS ===');
  requests.forEach(r => {
    console.log(`ID: ${r.id}`);
    console.log(`  Status: ${r.status}`);
    console.log(`  UserId: ${r.userId}`);
    if (r.reviewedAt) console.log(`  ReviewedAt: ${r.reviewedAt}`);
    if (r.reviewNotes) console.log(`  ReviewNotes: ${r.reviewNotes}`);
    console.log('');
  });
}

checkVerifications().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
