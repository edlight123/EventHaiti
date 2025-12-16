/**
 * Script to fix tickets_sold counts for events
 * Counts actual tickets in Firestore and updates event.tickets_sold field
 * 
 * Run with: npx tsx scripts/fix-tickets-sold.ts
 */

// Load environment variables
import 'dotenv/config'
import { adminDb } from '../lib/firebase/admin'

async function fixTicketsSold() {
  console.log('🔄 Starting tickets_sold count fix...')
  
  try {
    // Get all events
    const eventsSnapshot = await adminDb.collection('events').get()
    console.log(`Found ${eventsSnapshot.size} events`)
    
    let fixed = 0
    let errors = 0
    
    for (const eventDoc of eventsSnapshot.docs) {
      const eventId = eventDoc.id
      const event = eventDoc.data()
      
      try {
        // Count tickets for this event
        const ticketsSnapshot = await adminDb
          .collection('tickets')
          .where('event_id', '==', eventId)
          .where('status', 'in', ['valid', 'confirmed'])
          .get()
        
        const actualCount = ticketsSnapshot.size
        const currentCount = event.tickets_sold || 0
        
        if (actualCount !== currentCount) {
          // Update the count
          await adminDb.collection('events').doc(eventId).update({
            tickets_sold: actualCount
          })
          
          console.log(`✅ Fixed event ${eventId} (${event.title || 'Unnamed'}): ${currentCount} → ${actualCount}`)
          fixed++
        } else {
          console.log(`✓ Event ${eventId} (${event.title || 'Unnamed'}): already correct (${actualCount})`)
        }
      } catch (error: any) {
        console.error(`❌ Error processing event ${eventId}:`, error.message)
        errors++
      }
    }
    
    console.log('\n📊 Summary:')
    console.log(`  - Total events: ${eventsSnapshot.size}`)
    console.log(`  - Fixed: ${fixed}`)
    console.log(`  - Errors: ${errors}`)
    console.log(`  - Already correct: ${eventsSnapshot.size - fixed - errors}`)
    
  } catch (error: any) {
    console.error('❌ Script failed:', error.message)
    process.exit(1)
  }
}

// Run the script
fixTicketsSold()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
