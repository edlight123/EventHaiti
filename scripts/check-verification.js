/**
 * Quick script to check verification status for a specific user
 * Usage: npm run check-verification
 */

const admin = require('firebase-admin')

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}')
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

const db = admin.firestore()

async function checkVerification() {
  const email = 'info@edlight.org'
  
  console.log('🔍 Checking verification for:', email)
  console.log('━'.repeat(60))
  
  try {
    // Find user
    const usersSnapshot = await db
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get()
    
    if (usersSnapshot.empty) {
      console.log('❌ User not found')
      return
    }
    
    const userDoc = usersSnapshot.docs[0]
    const userId = userDoc.id
    const userData = userDoc.data()
    
    console.log('👤 User found:', userId)
    console.log('📧 Email:', userData.email)
    console.log('👔 Role:', userData.role)
    console.log('✓ User verification_status:', userData.verification_status)
    console.log('━'.repeat(60))
    
    // Check verification_requests
    const verificationDoc = await db
      .collection('verification_requests')
      .doc(userId)
      .get()
    
    if (verificationDoc.exists) {
      const verificationData = verificationDoc.data()
      console.log('✅ Verification request exists')
      console.log('📊 Status:', verificationData.status)
      console.log('📅 Created:', verificationData.createdAt?.toDate())
      console.log('🔄 Updated:', verificationData.updatedAt?.toDate())
      
      if (verificationData.steps) {
        console.log('\n📋 Steps:')
        Object.entries(verificationData.steps).forEach(([key, step]) => {
          console.log(`  - ${key}:`, step.status)
        })
      }
      
      if (verificationData.files) {
        console.log('\n📎 Files:')
        console.log(JSON.stringify(verificationData.files, null, 2))
      }
    } else {
      console.log('❌ No verification request found')
    }
    
    console.log('━'.repeat(60))
    
    // Check payout config
    const payoutConfigDoc = await db
      .collection('organizers')
      .doc(userId)
      .collection('payoutConfig')
      .doc('main')
      .get()
    
    if (payoutConfigDoc.exists) {
      const payoutConfig = payoutConfigDoc.data()
      console.log('💰 Payout Config exists')
      console.log('📊 Status:', payoutConfig.status)
      console.log('💳 Method:', payoutConfig.method)
      console.log('✓ Verification Status:', payoutConfig.verificationStatus)
    } else {
      console.log('❌ No payout config found')
    }
    
    console.log('━'.repeat(60))
    
    // Check verification documents
    const verificationDocsSnapshot = await db
      .collection('organizers')
      .doc(userId)
      .collection('verificationDocuments')
      .get()
    
    if (!verificationDocsSnapshot.empty) {
      console.log('📄 Verification Documents:')
      verificationDocsSnapshot.docs.forEach(doc => {
        console.log(`  - ${doc.id}:`, doc.data())
      })
    } else {
      console.log('❌ No verification documents found')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
  
  process.exit(0)
}

checkVerification()
