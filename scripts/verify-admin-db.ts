/**
 * Verify Admin Dashboard Database Setup
 * 
 * This script verifies that all required collections and indexes exist
 * for the admin dashboard to function properly.
 */

import { adminDb } from '../lib/firebase/admin'

async function verifyAdminDashboard() {
  console.log('🔍 Verifying Admin Dashboard Database Setup...\n')

  // Required collections
  const collections = ['users', 'events', 'tickets', 'verification_requests']
  
  for (const collectionName of collections) {
    try {
      const snapshot = await adminDb.collection(collectionName).limit(1).get()
      const count = snapshot.size
      console.log(`✅ ${collectionName}: ${count > 0 ? 'Has data' : 'Empty (ready)'}`)
      
      // Check sample doc structure
      if (count > 0) {
        const doc = snapshot.docs[0]
        const data = doc.data()
        console.log(`   Sample fields: ${Object.keys(data).slice(0, 5).join(', ')}...`)
        
        // Check for timestamp fields
        if (collectionName === 'events') {
          const hasCreatedAt = 'createdAt' in data || 'created_at' in data
          const hasStartDateTime = 'startDateTime' in data || 'start_datetime' in data
          console.log(`   Timestamp fields: createdAt=${hasCreatedAt}, startDateTime=${hasStartDateTime}`)
        }
        
        if (collectionName === 'verification_requests') {
          const hasCreatedAt = 'createdAt' in data || 'created_at' in data
          const hasStatus = 'status' in data
          console.log(`   Required fields: createdAt=${hasCreatedAt}, status=${hasStatus}`)
        }
      }
    } catch (error) {
      console.log(`❌ ${collectionName}: Error - ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  }

  // Check platform_stats_daily collection
  console.log('\n📊 Checking 7-day metrics rollup collection...')
  try {
    const today = new Date().toISOString().split('T')[0]
    const statsDoc = await adminDb.collection('platform_stats_daily').doc(today).get()
    
    if (statsDoc.exists) {
      const data = statsDoc.data()
      console.log(`✅ platform_stats_daily: Has data for today (${today})`)
      console.log(`   gmvConfirmed: ${data?.gmvConfirmed || 0}`)
      console.log(`   ticketsConfirmed: ${data?.ticketsConfirmed || 0}`)
    } else {
      console.log(`⚠️  platform_stats_daily: No data for today`)
      console.log('   ℹ️  This is expected if you haven\'t implemented the Cloud Function yet')
      console.log('   ℹ️  Dashboard will show 0 for 7-day metrics until rollups are created')
    }
  } catch (error) {
    console.log(`❌ platform_stats_daily: Error - ${error instanceof Error ? error.message : 'Unknown'}`)
  }

  // Required indexes
  console.log('\n🔎 Required Composite Indexes:')
  console.log('   1. verification_requests: status (asc) + createdAt/created_at (desc)')
  console.log('   2. events: createdAt/created_at (desc)')
  console.log('\n   ℹ️  These indexes will be auto-created on first query')
  console.log('   ℹ️  Check Firebase Console > Firestore > Indexes if queries fail')

  console.log('\n✨ Verification complete!\n')
}

// Run if executed directly
if (require.main === module) {
  verifyAdminDashboard()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { verifyAdminDashboard }
